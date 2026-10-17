import "server-only";
import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { type DbOrTx, readyDb } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { conversationMembers, conversations, messages, user } from "@/lib/db/schema";

export type { DbOrTx };
export { readyDb };

export type MessageRow = typeof messages.$inferSelect;
/** Message row joined to its sender — the only read shape services use. */
export type MessageWithSender = {
  message: MessageRow;
  sender: { id: string; name: string; image: string | null };
};

export async function insertMessage(
  db: DbOrTx,
  input: { conversationId: string; senderId: string; body: string; clientMessageId?: string },
): Promise<MessageRow> {
  const row: MessageRow = {
    id: newId(),
    conversationId: input.conversationId,
    senderId: input.senderId,
    body: input.body,
    createdAt: new Date(),
    editedAt: null,
    deletedAt: null,
    clientMessageId: input.clientMessageId ?? null,
  };
  await db.insert(messages).values(row);
  return row;
}

export async function findByIdWithSender(
  db: DbOrTx,
  messageId: string,
): Promise<MessageWithSender | undefined> {
  const [row] = await db
    .select({ message: messages, sender: { id: user.id, name: user.name, image: user.image } })
    .from(messages)
    .innerJoin(user, eq(messages.senderId, user.id))
    .where(eq(messages.id, messageId));
  return row;
}

export async function findByIdempotencyKey(
  db: DbOrTx,
  input: { senderId: string; clientMessageId: string },
): Promise<MessageWithSender | undefined> {
  const [row] = await db
    .select({ message: messages, sender: { id: user.id, name: user.name, image: user.image } })
    .from(messages)
    .innerJoin(user, eq(messages.senderId, user.id))
    .where(
      and(
        eq(messages.senderId, input.senderId),
        eq(messages.clientMessageId, input.clientMessageId),
      ),
    );
  return row;
}

/**
 * Newest-first page for a conversation (soft-deleted included — the DTO blanks
 * their body). Keyset on (createdAt, id); pass `limit + 1` to detect next page.
 */
export async function listPage(
  db: DbOrTx,
  input: { conversationId: string; cursor?: { createdAt: Date; id: string }; limit: number },
): Promise<MessageWithSender[]> {
  const where = and(
    eq(messages.conversationId, input.conversationId),
    input.cursor
      ? or(
          lt(messages.createdAt, input.cursor.createdAt),
          and(eq(messages.createdAt, input.cursor.createdAt), lt(messages.id, input.cursor.id)),
        )
      : undefined,
  );
  return db
    .select({ message: messages, sender: { id: user.id, name: user.name, image: user.image } })
    .from(messages)
    .innerJoin(user, eq(messages.senderId, user.id))
    .where(where)
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(input.limit);
}

export async function setEdited(
  db: DbOrTx,
  input: { messageId: string; body: string },
): Promise<void> {
  await db
    .update(messages)
    .set({ body: input.body, editedAt: new Date() })
    .where(eq(messages.id, input.messageId));
}

export async function setDeleted(db: DbOrTx, messageId: string): Promise<void> {
  await db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, messageId));
}

/** Bump conversations.updatedAt — conversation list ordering depends on it. */
export async function touchConversation(db: DbOrTx, conversationId: string): Promise<void> {
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

/**
 * Latest message per conversation for the given ids (by createdAt,id), joined
 * to sender. Two batched queries — window functions are overkill at page sizes.
 */
export async function latestPerConversation(
  db: DbOrTx,
  conversationIds: string[],
): Promise<Map<string, { body: string; senderName: string; createdAt: Date; deleted: boolean }>> {
  const result = new Map<
    string,
    { body: string; senderName: string; createdAt: Date; deleted: boolean }
  >();
  if (conversationIds.length === 0) return result;
  const maxRows = await db
    .select({
      conversationId: messages.conversationId,
      maxTs: sql<number>`max(${messages.createdAt})`,
    })
    .from(messages)
    .where(inArray(messages.conversationId, conversationIds))
    .groupBy(messages.conversationId);
  if (maxRows.length === 0) return result;

  // Per-conv latest-ts predicate — id tiebreak resolved by ordering in JS.
  const candidates = await db
    .select({
      conversationId: messages.conversationId,
      id: messages.id,
      body: messages.body,
      deletedAt: messages.deletedAt,
      createdAt: messages.createdAt,
      senderName: user.name,
    })
    .from(messages)
    .innerJoin(user, eq(messages.senderId, user.id))
    .where(
      or(
        ...maxRows.map((r) =>
          and(
            eq(messages.conversationId, r.conversationId),
            eq(messages.createdAt, new Date(r.maxTs)),
          ),
        ),
      ),
    );

  const best = new Map<string, (typeof candidates)[number]>();
  for (const row of candidates) {
    const cur = best.get(row.conversationId);
    if (!cur || row.id > cur.id) best.set(row.conversationId, row);
  }
  for (const [convId, row] of best) {
    result.set(convId, {
      body: row.body,
      senderName: row.senderName,
      createdAt: row.createdAt,
      deleted: row.deletedAt !== null,
    });
  }
  return result;
}

/**
 * Unread counts for `actorId` across the given conversations.
 * Watermark = member's lastReadMessageId; missing/unresolvable watermark →
 * all messages count. Sender's own + soft-deleted messages never count.
 * Three batched queries total — no per-conversation round trips.
 */
export async function unreadCounts(
  db: DbOrTx,
  input: { userId: string; conversationIds: string[] },
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (input.conversationIds.length === 0) return counts;

  const memberships = await db
    .select({
      conversationId: conversationMembers.conversationId,
      lastReadMessageId: conversationMembers.lastReadMessageId,
    })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.userId, input.userId),
        inArray(conversationMembers.conversationId, input.conversationIds),
      ),
    );

  const watermarkIds = memberships
    .map((m) => m.lastReadMessageId)
    .filter((id): id is string => id !== null);
  const wmRows = watermarkIds.length
    ? await db
        .select({ id: messages.id, createdAt: messages.createdAt })
        .from(messages)
        .where(inArray(messages.id, watermarkIds))
    : [];
  const wmTsById = new Map(wmRows.map((w) => [w.id, w.createdAt]));

  // convId → watermark ts|id; undefined means "unwatermarked → count all".
  const watermarks = new Map(
    memberships.map((m) => {
      const wm = m.lastReadMessageId ? wmTsById.get(m.lastReadMessageId) : undefined;
      return [
        m.conversationId,
        wm ? { createdAt: wm, id: m.lastReadMessageId as string } : undefined,
      ];
    }),
  );

  const unwatermarked = input.conversationIds.filter((id) => !watermarks.get(id));
  if (unwatermarked.length > 0) {
    const rows = await db
      .select({ conversationId: messages.conversationId, n: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, unwatermarked),
          isNull(messages.deletedAt),
          sql`${messages.senderId} <> ${input.userId}`,
        ),
      )
      .groupBy(messages.conversationId);
    for (const r of rows) counts.set(r.conversationId, r.n);
  }

  const watermarked = [...watermarks.entries()].filter(
    (e): e is [string, { createdAt: Date; id: string }] => e[1] !== undefined,
  );
  if (watermarked.length > 0) {
    const rows = await db
      .select({ conversationId: messages.conversationId, n: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          isNull(messages.deletedAt),
          sql`${messages.senderId} <> ${input.userId}`,
          or(
            ...watermarked.map(([convId, wm]) =>
              and(
                eq(messages.conversationId, convId),
                or(
                  gt(messages.createdAt, wm.createdAt),
                  and(eq(messages.createdAt, wm.createdAt), gt(messages.id, wm.id)),
                ),
              ),
            ),
          ),
        ),
      )
      .groupBy(messages.conversationId);
    for (const r of rows) counts.set(r.conversationId, r.n);
  }

  for (const id of input.conversationIds) {
    if (!counts.has(id)) counts.set(id, 0);
  }
  return counts;
}
