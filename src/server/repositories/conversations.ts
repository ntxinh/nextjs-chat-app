import "server-only";
import { and, asc, desc, eq, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { type DbOrTx, readyDb } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { conversationMembers, conversations, directConversationPairs, user } from "@/lib/db/schema";

export type { DbOrTx };
// `readyDb` re-export so services import the executor + repo fns from one place.
export { readyDb };

export type MemberRow = typeof conversationMembers.$inferSelect;
export type ConversationRow = typeof conversations.$inferSelect;

export async function insertConversation(
  db: DbOrTx,
  input: { type: "direct" | "group"; name?: string | null; createdBy: string },
): Promise<ConversationRow> {
  const now = new Date();
  const row: ConversationRow = {
    id: newId(),
    type: input.type,
    name: input.name ?? null,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(conversations).values(row);
  return row;
}

export async function insertMember(
  db: DbOrTx,
  input: {
    conversationId: string;
    userId: string;
    role?: "owner" | "member";
    joinedAt?: Date;
  },
): Promise<void> {
  await db.insert(conversationMembers).values({
    conversationId: input.conversationId,
    userId: input.userId,
    role: input.role ?? "member",
    joinedAt: input.joinedAt ?? new Date(),
  });
}

export async function findConversation(
  db: DbOrTx,
  conversationId: string,
): Promise<ConversationRow | undefined> {
  const [row] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  return row;
}

export async function findMember(
  db: DbOrTx,
  conversationId: string,
  userId: string,
): Promise<MemberRow | undefined> {
  const [row] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    );
  return row;
}

/** Members with leftAt IS NULL, joined user row attached, ordered by joinedAt. */
export async function findActiveMembers(
  db: DbOrTx,
  conversationId: string,
): Promise<Array<{ member: MemberRow; user: typeof user.$inferSelect }>> {
  return db
    .select({ member: conversationMembers, user })
    .from(conversationMembers)
    .innerJoin(user, eq(conversationMembers.userId, user.id))
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        isNull(conversationMembers.leftAt),
      ),
    )
    .orderBy(asc(conversationMembers.joinedAt), asc(conversationMembers.userId));
}

export async function findPair(
  db: DbOrTx,
  userA: string,
  userB: string,
): Promise<typeof directConversationPairs.$inferSelect | undefined> {
  const [row] = await db
    .select()
    .from(directConversationPairs)
    .where(and(eq(directConversationPairs.userA, userA), eq(directConversationPairs.userB, userB)));
  return row;
}

export async function insertPair(
  db: DbOrTx,
  input: { userA: string; userB: string; conversationId: string },
): Promise<void> {
  await db.insert(directConversationPairs).values(input);
}

/**
 * Conversations where `userId` is an active member, newest activity first.
 * Keyset pagination on (updatedAt, id); pass `limit + 1` to detect a next page.
 */
export async function listByUser(
  db: DbOrTx,
  input: { userId: string; cursor?: { updatedAt: Date; id: string }; limit: number },
): Promise<ConversationRow[]> {
  const where = and(
    eq(conversationMembers.userId, input.userId),
    isNull(conversationMembers.leftAt),
    input.cursor
      ? or(
          lt(conversations.updatedAt, input.cursor.updatedAt),
          and(
            eq(conversations.updatedAt, input.cursor.updatedAt),
            lt(conversations.id, input.cursor.id),
          ),
        )
      : undefined,
  );
  const rows = await db
    .select({ conversation: conversations })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
    .where(where)
    .orderBy(desc(conversations.updatedAt), desc(conversations.id))
    .limit(input.limit);
  return rows.map((r) => r.conversation);
}

/** Users who are members (any state) of a direct conv, excluding `actorId` — for DM display. */
export async function findDmPeers(
  db: DbOrTx,
  conversationIds: string[],
  actorId: string,
): Promise<Array<{ conversationId: string; id: string; name: string; image: string | null }>> {
  if (conversationIds.length === 0) return [];
  return db
    .select({
      conversationId: conversationMembers.conversationId,
      id: user.id,
      name: user.name,
      image: user.image,
    })
    .from(conversationMembers)
    .innerJoin(user, eq(conversationMembers.userId, user.id))
    .where(
      and(
        inArray(conversationMembers.conversationId, conversationIds),
        ne(conversationMembers.userId, actorId),
      ),
    );
}

export async function setLastRead(
  db: DbOrTx,
  input: { conversationId: string; userId: string; messageId: string },
): Promise<void> {
  await db
    .update(conversationMembers)
    .set({ lastReadMessageId: input.messageId })
    .where(
      and(
        eq(conversationMembers.conversationId, input.conversationId),
        eq(conversationMembers.userId, input.userId),
      ),
    );
}

export async function softDeleteMembership(
  db: DbOrTx,
  input: { conversationId: string; userId: string },
): Promise<void> {
  await db
    .update(conversationMembers)
    .set({ leftAt: new Date() })
    .where(
      and(
        eq(conversationMembers.conversationId, input.conversationId),
        eq(conversationMembers.userId, input.userId),
      ),
    );
}

/** Rejoin: re-activate a left membership. Role resets to member — re-promotion is a separate decision. */
export async function rejoinMembership(
  db: DbOrTx,
  input: { conversationId: string; userId: string },
): Promise<void> {
  await db
    .update(conversationMembers)
    .set({ leftAt: null, role: "member", joinedAt: new Date() })
    .where(
      and(
        eq(conversationMembers.conversationId, input.conversationId),
        eq(conversationMembers.userId, input.userId),
      ),
    );
}

export async function setMemberRole(
  db: DbOrTx,
  input: { conversationId: string; userId: string; role: "owner" | "member" },
): Promise<void> {
  await db
    .update(conversationMembers)
    .set({ role: input.role })
    .where(
      and(
        eq(conversationMembers.conversationId, input.conversationId),
        eq(conversationMembers.userId, input.userId),
      ),
    );
}

export async function renameConversation(
  db: DbOrTx,
  input: { conversationId: string; name: string },
): Promise<void> {
  await db
    .update(conversations)
    .set({ name: input.name, updatedAt: new Date() })
    .where(eq(conversations.id, input.conversationId));
}

export async function deleteConversation(db: DbOrTx, conversationId: string): Promise<void> {
  // conversation_members + direct_conversation_pairs cascade on conversations.id.
  await db.delete(conversations).where(eq(conversations.id, conversationId));
}
