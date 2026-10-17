import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { readyDb } from "@/lib/db";
import { conversationMembers, conversations, messages, user } from "@/lib/db/schema";
import {
  type ConversationSummary,
  createDirectConversation,
  createGroup,
  listConversations,
  markRead,
} from "@/server/services/conversations";
import { deleteMessage, editMessage, listMessages, sendMessage } from "@/server/services/messages";
import { resetDb } from "./helpers";

const USERS = [
  { id: "u-alice", name: "Alice", email: "alice@x.dev" },
  { id: "u-bob", name: "Bob", email: "bob@x.dev" },
  { id: "u-carol", name: "Carol", email: "carol@x.dev" },
  { id: "u-dan", name: "Dan", email: "dan@x.dev" },
];
const getConv = (items: ConversationSummary[], id: string) => {
  const c = items.find((x) => x.id === id);
  if (!c) throw new Error("conversation missing from list");
  return c;
};

const [alice, bob, carol, dan] = USERS;

let convId: string;

beforeEach(async () => {
  const db = await readyDb();
  await resetDb();
  await db.insert(user).values(USERS);
  ({ conversationId: convId } = await createGroup(alice.id, "G", [bob.id, carol.id]));
});

// Back-to-back sends can land on the same millisecond; pin createdAt to fixed
// distinct values so (createdAt, id) ordering is deterministic without sleeps.
const pinCreatedAt = async (messageId: string, iso: string) => {
  const db = await readyDb();
  await db
    .update(messages)
    .set({ createdAt: new Date(iso) })
    .where(eq(messages.id, messageId));
};

describe("sendMessage", () => {
  it("stores a trimmed message, bumps conversations.updatedAt", async () => {
    const other = await createGroup(alice.id, "H", [bob.id]);
    const db = await readyDb();
    await db
      .update(conversations)
      .set({ updatedAt: new Date("2026-01-01T00:00:00Z") })
      .where(eq(conversations.id, convId));

    const { message } = await sendMessage(convId, bob.id, "  hello  ", "c1");
    expect(message.body).toBe("hello");
    expect(message.sender).toMatchObject({ id: bob.id, name: "Bob" });
    const conv = (await db.select().from(conversations).where(eq(conversations.id, convId)))[0];
    expect(conv.updatedAt.getTime()).toBeGreaterThan(new Date("2026-01-01T00:00:00Z").getTime());
    // Ordering: the messaged conv now lists first despite the older conv.
    const list = await listConversations(alice.id);
    expect(list.items[0].id).toBe(convId);
    expect(list.items.map((c) => c.id)).toContain(other.conversationId);
  });

  it("enforces the 4000-char body limit", async () => {
    await expect(sendMessage(convId, bob.id, "x".repeat(4001))).rejects.toMatchObject({
      status: 400,
    });
    await expect(sendMessage(convId, bob.id, "   ")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("is idempotent on (senderId, clientMessageId)", async () => {
    const first = await sendMessage(convId, bob.id, "ping", "key-1");
    const replay = await sendMessage(convId, bob.id, "ping", "key-1");
    expect(replay.deduplicated).toBe(true);
    expect(replay.message.id).toBe(first.message.id);
    const db = await readyDb();
    const rows = await db.select().from(messages).where(eq(messages.conversationId, convId));
    expect(rows).toHaveLength(1);
    // A different clientMessageId sends a fresh row.
    const fresh = await sendMessage(convId, bob.id, "ping", "key-2");
    expect(fresh.deduplicated).toBe(false);
    expect(fresh.message.id).not.toBe(first.message.id);
    // Same key in another conversation is a conflict, not a silent replay.
    const other = await createGroup(alice.id, "H2", [bob.id]);
    await expect(sendMessage(other.conversationId, bob.id, "ping", "key-1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("rejects non-participants", async () => {
    await expect(sendMessage(convId, dan.id, "hi")).rejects.toMatchObject({
      status: 403,
    });
    await expect(sendMessage("no-such-conv", dan.id, "hi")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("listMessages", () => {
  it("orders deterministically under identical createdAt (id DESC)", async () => {
    const db = await readyDb();
    const ts = new Date("2026-02-01T12:00:00Z");
    for (const id of ["id-a", "id-c", "id-b"]) {
      await db.insert(messages).values({
        id,
        conversationId: convId,
        senderId: bob.id,
        body: "m",
        createdAt: ts,
        editedAt: null,
        deletedAt: null,
        clientMessageId: null,
      });
    }
    const page = await listMessages(alice.id, convId);
    expect(page.items.map((m) => m.id)).toEqual(["id-c", "id-b", "id-a"]);
  });

  it("paginates with an exact cursor boundary", async () => {
    const stamps = [
      "2026-02-01T12:00:01Z",
      "2026-02-01T12:00:02Z",
      "2026-02-01T12:00:03Z",
      "2026-02-01T12:00:04Z",
    ];
    for (const [i, body] of ["m1", "m2", "m3", "m4"].entries()) {
      const { message } = await sendMessage(convId, bob.id, body);
      await pinCreatedAt(message.id, stamps[i]);
    }
    const page1 = await listMessages(alice.id, convId, undefined, 2);
    expect(page1.items.map((m) => m.body)).toEqual(["m4", "m3"]);
    const page2 = await listMessages(alice.id, convId, page1.nextCursor ?? "", 2);
    expect(page2.items.map((m) => m.body)).toEqual(["m2", "m1"]);
    // Exact boundary: page 2 ends the set, so no cursor is issued.
    expect(page2.nextCursor).toBeNull();
    const all = await listMessages(alice.id, convId);
    expect(all.items.map((m) => m.body)).toEqual(["m4", "m3", "m2", "m1"]);
  });

  it("rejects a bad cursor and non-members", async () => {
    await sendMessage(convId, bob.id, "m");
    await expect(listMessages(alice.id, convId, "garbage")).rejects.toMatchObject({
      status: 400,
    });
    await expect(listMessages(dan.id, convId)).rejects.toMatchObject({ status: 403 });
  });
});

describe("editMessage / deleteMessage", () => {
  it("edits own message, sets editedAt, revalidates length", async () => {
    const { message } = await sendMessage(convId, bob.id, "orig");
    const edited = await editMessage(message.id, bob.id, "revised");
    expect(edited.body).toBe("revised");
    expect(edited.editedAt).not.toBeNull();
    await expect(editMessage(message.id, bob.id, "x".repeat(4001))).rejects.toMatchObject({
      status: 400,
    });
  });

  it("rejects edits by non-author members and non-members", async () => {
    const { message } = await sendMessage(convId, bob.id, "orig");
    await expect(editMessage(message.id, carol.id, "hijack")).rejects.toMatchObject({
      status: 403,
    });
    await expect(editMessage(message.id, dan.id, "hijack")).rejects.toMatchObject({
      status: 403,
    });
    await expect(editMessage("no-such-msg", bob.id, "x")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("soft-deletes: DTO has empty body + deleted flag; second delete is 410", async () => {
    const { message } = await sendMessage(convId, bob.id, "gone soon");
    const deleted = await deleteMessage(message.id, bob.id);
    expect(deleted.deleted).toBe(true);
    expect(deleted.body).toBe("");
    const page = await listMessages(alice.id, convId);
    expect(page.items[0]).toMatchObject({ id: message.id, body: "", deleted: true });
    await expect(deleteMessage(message.id, bob.id)).rejects.toMatchObject({
      status: 410,
    });
    // Edits of a deleted message are 410 too.
    await expect(editMessage(message.id, bob.id, "revive")).rejects.toMatchObject({
      status: 410,
    });
  });

  it("rejects deletes by non-authors", async () => {
    const { message } = await sendMessage(convId, bob.id, "keep");
    await expect(deleteMessage(message.id, carol.id)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("listConversations preview / unread fill", () => {
  it("reports latest-message preview and watermark unread count", async () => {
    const m1 = await sendMessage(convId, bob.id, "first");
    const m2 = await sendMessage(convId, alice.id, "second");
    await pinCreatedAt(m1.message.id, "2026-02-01T12:00:01Z");
    await pinCreatedAt(m2.message.id, "2026-02-01T12:00:02Z");
    let list = await listConversations(alice.id);

    let conv = getConv(list.items, convId);
    // alice's own latest message: preview shows it, but it isn't unread for her.
    expect(conv.preview).toMatchObject({ body: "second", senderName: "Alice" });
    expect(conv.unreadCount).toBe(1);

    // bob sees one unread (m2, alice's) — his own m1 doesn't count.
    list = await listConversations(bob.id);
    conv = getConv(list.items, convId);
    expect(conv.preview).toMatchObject({ senderName: "Alice", body: "second" });
    expect(conv.unreadCount).toBe(1);
    await markRead(bob.id, convId, m2.message.id);
    list = await listConversations(bob.id);
    conv = getConv(list.items, convId);
    expect(conv.unreadCount).toBe(0);
    // A stale (earlier) watermark still counts what came after it.
    await markRead(carol.id, convId, m1.message.id);
    list = await listConversations(carol.id);
    conv = getConv(list.items, convId);
    expect(conv.unreadCount).toBe(1);

    // Truncated preview body and blank preview for a deleted latest message.
    const long = await sendMessage(convId, bob.id, "y".repeat(250));
    await pinCreatedAt(long.message.id, "2026-02-01T12:00:03Z");
    list = await listConversations(carol.id);
    conv = getConv(list.items, convId);
    expect(conv.preview?.body).toHaveLength(100);
    await deleteMessage(long.message.id, bob.id);
    list = await listConversations(carol.id);
    conv = getConv(list.items, convId);
    expect(conv.preview?.body).toBe("");
  });
});

describe("markRead message check", () => {
  it("404s on nonexistent or foreign-conversation message ids", async () => {
    const dm = await createDirectConversation(alice.id, dan.id);
    const { message } = await sendMessage(dm.conversationId, dan.id, "dm msg");
    await expect(markRead(bob.id, convId, message.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(markRead(bob.id, convId, "no-such-msg")).rejects.toMatchObject({
      status: 404,
    });
    const own = await sendMessage(convId, bob.id, "real");
    await markRead(bob.id, convId, own.message.id);
    const db = await readyDb();
    const row = (
      await db
        .select()
        .from(conversationMembers)
        .where(eq(conversationMembers.conversationId, convId))
    ).find((r) => r.userId === bob.id);
    expect(row?.lastReadMessageId).toBe(own.message.id);
  });
});
