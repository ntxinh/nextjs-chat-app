import "server-only";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { readyDb } from "@/lib/db";
import { normalizePair } from "@/lib/dm-pair";
import { AppError } from "@/lib/errors/app-error";
import { assertMembership } from "@/server/policies/conversations";
import * as repo from "@/server/repositories/conversations";
import * as msgRepo from "@/server/repositories/messages";
import { findUsersByIds } from "@/server/repositories/users";

export type ConversationSummary = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  preview: { body: string; senderName: string; createdAt: Date } | null;
  unreadCount: number;
  otherUser?: { id: string; name: string; image: string | null };
};

export type ConversationDetail = ConversationSummary & {
  members: Array<{
    id: string;
    name: string;
    image: string | null;
    role: "owner" | "member";
    lastSeenAt: Date | null;
    lastReadMessageId: string | null;
  }>;
};

/** Preview bodies truncated — lists shouldn't ship whole messages. */
const PREVIEW_LEN = 100;

function toPreview(p: {
  body: string;
  senderName: string;
  createdAt: Date;
  deleted: boolean;
}): ConversationSummary["preview"] {
  return {
    body: p.deleted ? "" : p.body.slice(0, PREVIEW_LEN),
    senderName: p.senderName,
    createdAt: p.createdAt,
  };
}

export async function createDirectConversation(
  actorId: string,
  otherUserId: string,
): Promise<{ conversationId: string; created: boolean }> {
  const db = await readyDb();
  let userA: string;
  let userB: string;
  try {
    [userA, userB] = normalizePair(actorId, otherUserId);
  } catch {
    throw new AppError(400, "bad_request", "Cannot open a direct conversation with yourself");
  }

  const [other] = await findUsersByIds(db, [otherUserId]);
  if (!other) throw new AppError(404, "not_found", "User not found");

  const existing = await repo.findPair(db, userA, userB);
  if (existing) return { conversationId: existing.conversationId, created: false };

  try {
    return await db.transaction(async (tx) => {
      const winner = await repo.findPair(tx, userA, userB);
      if (winner) return { conversationId: winner.conversationId, created: false };
      const conv = await repo.insertConversation(tx, { type: "direct", createdBy: actorId });
      await repo.insertMember(tx, { conversationId: conv.id, userId: actorId });
      await repo.insertMember(tx, { conversationId: conv.id, userId: otherUserId });
      await repo.insertPair(tx, { userA, userB, conversationId: conv.id });
      return { conversationId: conv.id, created: true };
    });
  } catch (error) {
    // Race: another tx inserted the pair between our check and insert — the
    // composite PK rejected ours and rolled the orphan conv back. Winner is visible now.
    const winner = await repo.findPair(db, userA, userB);
    if (winner) return { conversationId: winner.conversationId, created: false };
    throw error;
  }
}

export async function createGroup(
  actorId: string,
  name: string,
  memberIds: string[],
): Promise<{ conversationId: string }> {
  const db = await readyDb();
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new AppError(400, "bad_request", "Group name must be 1–100 characters");
  }

  const others = [...new Set(memberIds)].filter((id) => id !== actorId);
  const found = await findUsersByIds(db, others);
  if (found.length !== others.length) {
    const foundIds = new Set(found.map((u) => u.id));
    const missing = others.find((id) => !foundIds.has(id));
    throw new AppError(404, "not_found", `User not found: ${missing}`);
  }

  return db.transaction(async (tx) => {
    const conv = await repo.insertConversation(tx, {
      type: "group",
      name: trimmed,
      createdBy: actorId,
    });
    await repo.insertMember(tx, { conversationId: conv.id, userId: actorId, role: "owner" });
    for (const id of others) {
      await repo.insertMember(tx, { conversationId: conv.id, userId: id });
    }
    return { conversationId: conv.id };
  });
}

export async function listConversations(
  actorId: string,
  cursor?: string,
  limit = 20,
): Promise<{ items: ConversationSummary[]; nextCursor: string | null }> {
  const db = await readyDb();
  const decoded = cursor ? decodeCursor(cursor) : null;
  if (cursor && !decoded) throw new AppError(400, "bad_request", "Invalid cursor");
  const rows = await repo.listByUser(db, {
    userId: actorId,
    cursor: decoded ? { updatedAt: new Date(decoded.createdAt), id: decoded.id } : undefined,
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);

  const peers = await repo.findDmPeers(
    db,
    page.filter((c) => c.type === "direct").map((c) => c.id),
    actorId,
  );
  const peerByConv = new Map(peers.map((p) => [p.conversationId, p]));

  const convIds = page.map((c) => c.id);
  const [previews, unreads] = await Promise.all([
    msgRepo.latestPerConversation(db, convIds),
    msgRepo.unreadCounts(db, { userId: actorId, conversationIds: convIds }),
  ]);

  const items = page.map((c): ConversationSummary => {
    const p = previews.get(c.id);
    const summary: ConversationSummary = {
      id: c.id,
      type: c.type,
      name: c.name,
      preview: p ? toPreview(p) : null,
      unreadCount: unreads.get(c.id) ?? 0,
    };
    if (c.type === "direct") {
      const peer = peerByConv.get(c.id);
      if (peer) summary.otherUser = { id: peer.id, name: peer.name, image: peer.image };
    }
    return summary;
  });

  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last.updatedAt.getTime(), last.id) : null,
  };
}

export async function getConversation(
  actorId: string,
  convId: string,
): Promise<ConversationDetail> {
  const db = await readyDb();
  await assertMembership(convId, actorId);
  const conv = await repo.findConversation(db, convId);
  if (!conv) throw new AppError(404, "not_found", "Conversation not found");

  const memberRows = await repo.findActiveMembers(db, convId);
  const members = memberRows.map(({ member, user: u }) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    role: member.role,
    lastSeenAt: u.lastSeenAt,
    lastReadMessageId: member.lastReadMessageId,
  }));

  const [previews, unreads] = await Promise.all([
    msgRepo.latestPerConversation(db, [convId]),
    msgRepo.unreadCounts(db, { userId: actorId, conversationIds: [convId] }),
  ]);
  const preview = previews.get(convId);
  const detail: ConversationDetail = {
    id: conv.id,
    type: conv.type,
    name: conv.name,
    preview: preview ? toPreview(preview) : null,
    unreadCount: unreads.get(convId) ?? 0,
    members,
  };
  if (conv.type === "direct") {
    const peer = members.find((m) => m.id !== actorId);
    if (peer) detail.otherUser = { id: peer.id, name: peer.name, image: peer.image };
  }
  return detail;
}

export async function renameGroup(actorId: string, convId: string, name: string): Promise<void> {
  const db = await readyDb();
  const member = await assertMembership(convId, actorId);
  const conv = await repo.findConversation(db, convId);
  if (!conv) throw new AppError(404, "not_found", "Conversation not found");
  if (conv.type !== "group") {
    throw new AppError(400, "bad_request", "Cannot rename a direct conversation");
  }
  if (member.role !== "owner") throw new AppError(403, "forbidden", "Owner role required");

  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new AppError(400, "bad_request", "Group name must be 1–100 characters");
  }
  await repo.renameConversation(db, { conversationId: convId, name: trimmed });
}

export async function addMember(actorId: string, convId: string, userId: string): Promise<void> {
  const db = await readyDb();
  const member = await assertMembership(convId, actorId);
  const conv = await repo.findConversation(db, convId);
  if (!conv) throw new AppError(404, "not_found", "Conversation not found");
  if (conv.type !== "group") {
    throw new AppError(400, "bad_request", "Cannot add members to a direct conversation");
  }
  if (member.role !== "owner") throw new AppError(403, "forbidden", "Owner role required");

  const [target] = await findUsersByIds(db, [userId]);
  if (!target) throw new AppError(404, "not_found", "User not found");

  const existing = await repo.findMember(db, convId, userId);
  if (existing) {
    if (!existing.leftAt) throw new AppError(409, "conflict", "Already a member");
    await repo.rejoinMembership(db, { conversationId: convId, userId });
    return;
  }
  await repo.insertMember(db, { conversationId: convId, userId });
}

export async function leaveConversation(actorId: string, convId: string): Promise<void> {
  const db = await readyDb();
  const member = await assertMembership(convId, actorId);

  await db.transaction(async (tx) => {
    await repo.softDeleteMembership(tx, { conversationId: convId, userId: actorId });
    const remaining = await repo.findActiveMembers(tx, convId);
    if (remaining.length === 0) {
      await repo.deleteConversation(tx, convId);
      return;
    }
    if (member.role === "owner" && !remaining.some((r) => r.member.role === "owner")) {
      // Earliest joinedAt (ties broken by userId — findActiveMembers orders both).
      const next = remaining[0];
      await repo.setMemberRole(tx, {
        conversationId: convId,
        userId: next.user.id,
        role: "owner",
      });
    }
  });
}

export async function markRead(actorId: string, convId: string, messageId: string): Promise<void> {
  const db = await readyDb();
  await assertMembership(convId, actorId);
  if (typeof messageId !== "string" || messageId.length === 0) {
    throw new AppError(400, "bad_request", "messageId required");
  }
  const message = await msgRepo.findByIdWithSender(db, messageId);
  // Wrong-conversation message is a 404 too — don't leak that it exists.
  if (!message || message.message.conversationId !== convId) {
    throw new AppError(404, "not_found", "Message not found");
  }
  await repo.setLastRead(db, { conversationId: convId, userId: actorId, messageId });
}
