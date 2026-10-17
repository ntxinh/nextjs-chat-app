import "server-only";
import { readyDb } from "@/lib/db";
import { normalizePair } from "@/lib/dm-pair";
import { AppError } from "@/lib/errors/app-error";
import { assertMembership } from "@/server/policies/conversations";
import * as repo from "@/server/repositories/conversations";
import { findUsersByIds } from "@/server/repositories/users";

export type ConversationSummary = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  // TODO(T21): join messages — real shape ships now, values land with the messages table.
  preview: { body: string; senderName: string; createdAt: Date } | null;
  unreadCount: number; // TODO(T21): countUnread vs lastReadMessageId watermark
  otherUser?: { id: string; name: string; image: string | null };
};

export type ConversationDetail = ConversationSummary & {
  members: Array<{
    id: string;
    name: string;
    image: string | null;
    role: "owner" | "member";
    lastSeenAt: Date | null;
  }>;
};

// TODO(T21): replace with shared cursor.ts codec once it lands — same base64url
// [ts, id] keyset pattern, kept local here to avoid inventing the contract early.
function encodeCursor(updatedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify([updatedAt.getTime(), id])).toString("base64url");
}

function decodeCursor(cursor: string): { updatedAt: Date; id: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new AppError(400, "bad_request", "Invalid cursor");
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 2 ||
    typeof parsed[0] !== "number" ||
    typeof parsed[1] !== "string"
  ) {
    throw new AppError(400, "bad_request", "Invalid cursor");
  }
  return { updatedAt: new Date(parsed[0]), id: parsed[1] };
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
  const rows = await repo.listByUser(db, {
    userId: actorId,
    cursor: cursor ? decodeCursor(cursor) : undefined,
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

  const items = page.map((c): ConversationSummary => {
    const summary: ConversationSummary = {
      id: c.id,
      type: c.type,
      name: c.name,
      preview: null,
      unreadCount: 0,
    };
    if (c.type === "direct") {
      const peer = peerByConv.get(c.id);
      if (peer) summary.otherUser = { id: peer.id, name: peer.name, image: peer.image };
    }
    return summary;
  });

  return { items, nextCursor: hasMore && last ? encodeCursor(last.updatedAt, last.id) : null };
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
  }));

  const detail: ConversationDetail = {
    id: conv.id,
    type: conv.type,
    name: conv.name,
    preview: null,
    unreadCount: 0,
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
  // TODO(T21/22): validate messageId exists in `messages` once the table lands —
  // lastReadMessageId is a plain text column until then.
  await repo.setLastRead(db, { conversationId: convId, userId: actorId, messageId });
}
