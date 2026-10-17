import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { findConversation, findMember, readyDb } from "@/server/repositories/conversations";

/**
 * Gate every member-scoped read/write through this.
 * 404 when the conversation doesn't exist; 403 when it exists but the actor
 * isn't an active member (incl. members who left — leftAt set).
 */
export async function assertMembership(conversationId: string, userId: string) {
  const db = await readyDb();
  const conv = await findConversation(db, conversationId);
  if (!conv) throw new AppError(404, "not_found", "Conversation not found");
  const member = await findMember(db, conversationId, userId);
  if (!member || member.leftAt) throw new AppError(403, "forbidden", "Not a member");
  return member;
}
