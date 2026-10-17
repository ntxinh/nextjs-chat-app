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
import { user } from "@/lib/db/schema";
import {
  createDirectConversation,
  createGroup,
  listConversations,
} from "@/server/services/conversations";

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

    const existing = await listConversations(aliceId);
    if (!existing.items.some((c) => c.type === "group" && c.name === "Dev Chat")) {
      await createGroup(aliceId, "Dev Chat", [bobId, carolId, danId]);
      console.log('created group "Dev Chat"');
    }
  } else {
    console.log("skipped conversation seed (missing seed users)");
  }
  // Task 21+: seed messages once the messages table exists.

  const total = await db.$count(user);
  console.log(`seed done: ${created} created, ${skipped} skipped, ${total} users total`);
}
main();
