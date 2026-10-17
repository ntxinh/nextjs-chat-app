/**
 * Deterministic dev seed. Dev-only — throws in production.
 * Run: pnpm db:seed   (tsx --conditions=react-server lets `server-only` resolve
 * to its no-op module so we can reuse the real `auth` instance).
 *
 * Idempotent: users are looked up by email before signup, so reruns create nothing.
 */
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { readyDb } from "@/lib/db";
import { messages, user } from "@/lib/db/schema";
import { setLastRead } from "@/server/repositories/conversations";
import {
  createDirectConversation,
  createGroup,
  listConversations,
} from "@/server/services/conversations";
import { sendMessage } from "@/server/services/messages";

const SEED_USERS = [
  { email: "alice@dev.local", name: "Alice" },
  { email: "bob@dev.local", name: "Bob" },
  { email: "carol@dev.local", name: "Carol" },
  { email: "dan@dev.local", name: "Dan" },
];
const SEED_PASSWORD = "password1234";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed script must not run in production");
  }

  const db = await readyDb();
  let created = 0;
  let skipped = 0;

  for (const seedUser of SEED_USERS) {
    const existing = await db.query.user.findFirst({
      where: eq(user.email, seedUser.email),
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    try {
      await auth.api.signUpEmail({
        body: { email: seedUser.email, password: SEED_PASSWORD, name: seedUser.name },
        headers: new Headers(),
      });
      created += 1;
      console.log(`created ${seedUser.email}`);
    } catch (error) {
      // Race-safe fallback: user created between lookup and signup.
      skipped += 1;
      console.log(`skipped ${seedUser.email} (${error instanceof Error ? error.message : error})`);
    }
  }

  // Conversation seeding through the real services. Idempotent: the DM pair PK
  // makes createDirectConversation return created:false on rerun; "Dev Chat" is
  // checked by name (groups carry no dedup constraint by design).
  const idByEmail = new Map(
    (await db.select({ id: user.id, email: user.email }).from(user)).map((u) => [u.email, u.id]),
  );
  const [aliceId, bobId, carolId, danId] = [
    idByEmail.get("alice@dev.local"),
    idByEmail.get("bob@dev.local"),
    idByEmail.get("carol@dev.local"),
    idByEmail.get("dan@dev.local"),
  ];
  if (aliceId && bobId && carolId && danId) {
    const dm = await createDirectConversation(aliceId, bobId);
    if (dm.created) console.log("created DM alice↔bob");

    let groupId: string | undefined;
    const existing = await listConversations(aliceId);
    if (!existing.items.some((c) => c.type === "group" && c.name === "Dev Chat")) {
      groupId = (await createGroup(aliceId, "Dev Chat", [bobId, carolId, danId])).conversationId;
      console.log('created group "Dev Chat"');
    } else {
      groupId = existing.items.find((c) => c.type === "group" && c.name === "Dev Chat")?.id;
    }

    // Messages through the real service with deterministic clientMessageIds —
    // reruns dedup instead of doubling. 60 in the DM (past the 50/page default)
    // so history pagination is exercisable, ~10 in the group, back-dated so
    // createdAt ordering looks real. Members are left fully read so unread
    // state stays deterministic.
    const seedHistory = async (
      conversationId: string,
      turns: Array<{ senderId: string; body: string }>,
    ) => {
      const spacingMs = 75_000;
      for (const [i, turn] of turns.entries()) {
        const { message } = await sendMessage(
          conversationId,
          turn.senderId,
          turn.body,
          `seed-${conversationId}-${i}`,
        );
        await db
          .update(messages)
          .set({ createdAt: new Date(Date.now() - (turns.length - i) * spacingMs) })
          .where(eq(messages.id, message.id));
        if (i === turns.length - 1) {
          for (const memberId of new Set(turns.map((t2) => t2.senderId))) {
            await setLastRead(db, { conversationId, userId: memberId, messageId: message.id });
          }
        }
      }
    };

    const dmTurns = Array.from({ length: 60 }, (_, i) => ({
      senderId: i % 2 === 0 ? aliceId : bobId,
      body: `DM message ${i + 1}`,
    }));
    dmTurns.push({ senderId: bobId, body: "See you tomorrow!" });
    await seedHistory(dm.conversationId, dmTurns);

    if (groupId) {
      const groupTurns = [
        { senderId: aliceId, body: "Welcome to Dev Chat!" },
        { senderId: carolId, body: "Hey everyone" },
        { senderId: danId, body: "Hi!" },
        { senderId: bobId, body: "What's on the agenda?" },
        { senderId: aliceId, body: "Shipping the messaging UI" },
        { senderId: carolId, body: "Nice — polling or websockets?" },
        { senderId: aliceId, body: "Polling for now, 5s interval" },
        { senderId: danId, body: "Works for me" },
      ];
      await seedHistory(groupId, groupTurns);
    }
  } else {
    console.log("skipped conversation seed (missing seed users)");
  }

  const total = await db.$count(user);
  console.log(`seed done: ${created} created, ${skipped} skipped, ${total} users total`);
}
main();
