import "server-only";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { readyDb } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { withSpan } from "@/lib/observability/tracer";
import { MESSAGE_BODY_MAX } from "@/lib/validation/messages";
import { assertMembership } from "@/server/policies/conversations";
import { assertOwnership } from "@/server/policies/messages";
import * as repo from "@/server/repositories/messages";

export type MessageDTO = {
  id: string;
  conversationId: string;
  sender: { id: string; name: string; image: string | null };
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  deleted: boolean;
};

export function toMessageDTO(row: repo.MessageWithSender): MessageDTO {
  const deleted = row.message.deletedAt !== null;
  return {
    id: row.message.id,
    conversationId: row.message.conversationId,
    sender: row.sender,
    body: deleted ? "" : row.message.body,
    createdAt: row.message.createdAt,
    editedAt: row.message.editedAt,
    deleted,
  };
}

const isIdempotencyConflict = (e: unknown): boolean => {
  // Drizzle wraps the driver error ("Failed query: insert ...") — walk causes.
  for (let cur: unknown = e; cur instanceof Error; cur = cur.cause) {
    if (
      cur.message.includes(
        "UNIQUE constraint failed: messages.sender_id, messages.client_message_id",
      )
    ) {
      return true;
    }
  }
  return false;
};

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  clientMessageId?: string,
): Promise<{ message: MessageDTO; deduplicated: boolean }> {
  return withSpan("messages.send", { bodyLength: body.length }, () =>
    sendMessageImpl(conversationId, senderId, body, clientMessageId),
  );
}

async function sendMessageImpl(
  conversationId: string,
  senderId: string,
  body: string,
  clientMessageId?: string,
): Promise<{ message: MessageDTO; deduplicated: boolean }> {
  const db = await readyDb();
  await assertMembership(conversationId, senderId);
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > MESSAGE_BODY_MAX) {
    throw new AppError(400, "bad_request", `Message body must be 1–${MESSAGE_BODY_MAX} characters`);
  }

  try {
    const inserted = await db.transaction(async (tx) => {
      const row = await repo.insertMessage(tx, {
        conversationId,
        senderId,
        body: trimmed,
        clientMessageId,
      });
      await repo.touchConversation(tx, conversationId);
      return row;
    });
    const withSender = await repo.findByIdWithSender(db, inserted.id);
    if (!withSender) throw new Error("inserted message vanished");
    return { message: toMessageDTO(withSender), deduplicated: false };
  } catch (e) {
    if (!(clientMessageId && isIdempotencyConflict(e))) throw e;
    // Replay: return the original row. A different conversationId means the
    // client reused a key across convs — surface it, don't leak the other conv.
    const existing = await repo.findByIdempotencyKey(db, { senderId, clientMessageId });
    if (!existing) throw e;
    if (existing.message.conversationId !== conversationId) {
      throw new AppError(409, "conflict", "clientMessageId already used in another conversation");
    }
    return { message: toMessageDTO(existing), deduplicated: true };
  }
}

/** Newest-first page (DESC) — callers reverse for display order. */
export async function listMessages(
  actorId: string,
  conversationId: string,
  cursor?: string,
  limit = 50,
): Promise<{ items: MessageDTO[]; nextCursor: string | null }> {
  return withSpan("messages.list", { limit }, () =>
    listMessagesImpl(actorId, conversationId, cursor, limit),
  );
}

async function listMessagesImpl(
  actorId: string,
  conversationId: string,
  cursor?: string,
  limit = 50,
): Promise<{ items: MessageDTO[]; nextCursor: string | null }> {
  const db = await readyDb();
  await assertMembership(conversationId, actorId);
  const decoded = cursor ? decodeCursor(cursor) : null;
  if (cursor && !decoded) throw new AppError(400, "bad_request", "Invalid cursor");
  const rows = await repo.listPage(db, {
    conversationId,
    cursor: decoded ? { createdAt: new Date(decoded.createdAt), id: decoded.id } : undefined,
    limit: limit + 1,
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  return {
    items: page.map(toMessageDTO),
    nextCursor:
      hasMore && last ? encodeCursor(last.message.createdAt.getTime(), last.message.id) : null,
  };
}

export async function editMessage(
  messageId: string,
  actorId: string,
  body: string,
): Promise<MessageDTO> {
  const db = await readyDb();
  const row = await repo.findByIdWithSender(db, messageId);
  if (!row) throw new AppError(404, "not_found", "Message not found");
  await assertMembership(row.message.conversationId, actorId);
  assertOwnership(row.message, actorId);
  if (row.message.deletedAt) throw new AppError(410, "gone", "Message deleted");
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > MESSAGE_BODY_MAX) {
    throw new AppError(400, "bad_request", `Message body must be 1–${MESSAGE_BODY_MAX} characters`);
  }
  await repo.setEdited(db, { messageId, body: trimmed });
  const updated = await repo.findByIdWithSender(db, messageId);
  if (!updated) throw new Error("edited message vanished");
  return toMessageDTO(updated);
}

/** Deleting an already-deleted message is 410 gone — it's already gone. */
export async function deleteMessage(messageId: string, actorId: string): Promise<MessageDTO> {
  const db = await readyDb();
  const row = await repo.findByIdWithSender(db, messageId);
  if (!row) throw new AppError(404, "not_found", "Message not found");
  await assertMembership(row.message.conversationId, actorId);
  assertOwnership(row.message, actorId);
  if (row.message.deletedAt) throw new AppError(410, "gone", "Message deleted");
  await repo.setDeleted(db, messageId);
  const updated = await repo.findByIdWithSender(db, messageId);
  if (!updated) throw new Error("deleted message vanished");
  return toMessageDTO(updated);
}
