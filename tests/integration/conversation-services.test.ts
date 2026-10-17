import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { readyDb } from "@/lib/db";
import { conversationMembers, conversations, user } from "@/lib/db/schema";
import { assertMembership } from "@/server/policies/conversations";
import {
  addMember,
  createDirectConversation,
  createGroup,
  getConversation,
  leaveConversation,
  listConversations,
  markRead,
  renameGroup,
} from "@/server/services/conversations";
import { resetDb } from "./helpers";

const USERS = [
  { id: "u-alice", name: "Alice", email: "alice@x.dev" },
  { id: "u-bob", name: "Bob", email: "bob@x.dev" },
  { id: "u-carol", name: "Carol", email: "carol@x.dev" },
  { id: "u-dan", name: "Dan", email: "dan@x.dev" },
];
const [alice, bob, carol, dan] = USERS;

beforeEach(async () => {
  const db = await readyDb();
  await resetDb();
  await db.insert(user).values(USERS);
});

describe("createDirectConversation", () => {
  it("creates DM once per pair", async () => {
    const a = await createDirectConversation(alice.id, bob.id);
    expect(a.created).toBe(true);
    const b = await createDirectConversation(bob.id, alice.id);
    expect(b.conversationId).toBe(a.conversationId);
    expect(b.created).toBe(false);
  });

  it("rejects self-DM and unknown user", async () => {
    await expect(createDirectConversation(alice.id, alice.id)).rejects.toMatchObject({
      status: 400,
    });
    await expect(createDirectConversation(alice.id, "ghost")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("assertMembership", () => {
  it("rejects non-member access", async () => {
    const { conversationId } = await createGroup(alice.id, "g", [bob.id]);
    await expect(assertMembership(conversationId, carol.id)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("404s for missing conversation, 403s for left member", async () => {
    await expect(assertMembership("nope", alice.id)).rejects.toMatchObject({ status: 404 });
    const { conversationId } = await createGroup(alice.id, "g", [bob.id]);
    await leaveConversation(bob.id, conversationId);
    await expect(assertMembership(conversationId, bob.id)).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("leaveConversation", () => {
  it("transfers ownership when owner leaves", async () => {
    const { conversationId } = await createGroup(alice.id, "g", [bob.id, carol.id]);
    await leaveConversation(alice.id, conversationId);
    const db = await readyDb();
    const rows = await db
      .select()
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId));
    // Bob joined before Carol → promoted owner.
    expect(rows.find((r) => r.userId === bob.id)).toMatchObject({ role: "owner", leftAt: null });
    expect(rows.find((r) => r.userId === alice.id)?.leftAt).not.toBeNull();
  });

  it("deletes group when last member leaves", async () => {
    const { conversationId } = await createGroup(alice.id, "g", []);
    await leaveConversation(alice.id, conversationId);
    const db = await readyDb();
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });
    expect(conv).toBeUndefined();
    const members = await db
      .select()
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId));
    expect(members).toHaveLength(0);
  });
});

describe("listConversations", () => {
  it("excludes left members", async () => {
    const { conversationId } = await createGroup(alice.id, "g", [bob.id]);
    await leaveConversation(bob.id, conversationId);
    const mine = await listConversations(bob.id);
    expect(mine.items.find((c) => c.id === conversationId)).toBeUndefined();
  });

  it("exposes DM otherUser + honest placeholders", async () => {
    const { conversationId } = await createDirectConversation(alice.id, bob.id);
    const list = await listConversations(alice.id);
    const dm = list.items.find((c) => c.id === conversationId);
    expect(dm).toMatchObject({
      type: "direct",
      name: null,
      preview: null,
      unreadCount: 0,
      otherUser: { id: bob.id, name: "Bob" },
    });
  });

  it("paginates with a stable cursor", async () => {
    await createGroup(alice.id, "g1", []);
    const { conversationId: older } = await createGroup(alice.id, "g2", []);
    // Force distinct updatedAt ordering deterministically.
    const db = await readyDb();
    await db
      .update(conversations)
      .set({ updatedAt: new Date("2026-01-02T00:00:00Z") })
      .where(eq(conversations.id, older));

    const page1 = await listConversations(alice.id, undefined, 1);
    expect(page1.items).toHaveLength(1);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await listConversations(alice.id, page1.nextCursor ?? "bad", 1);
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0].id).not.toBe(page1.items[0].id);
    expect(page2.nextCursor).toBeNull();
  });
});

describe("renameGroup / addMember", () => {
  it("requires owner role", async () => {
    const { conversationId } = await createGroup(alice.id, "g", [bob.id]);
    await expect(renameGroup(bob.id, conversationId, "x")).rejects.toMatchObject({ status: 403 });
    await expect(addMember(bob.id, conversationId, carol.id)).rejects.toMatchObject({
      status: 403,
    });
    await renameGroup(alice.id, conversationId, "renamed");
    const detail = await getConversation(alice.id, conversationId);
    expect(detail.name).toBe("renamed");
  });

  it("rejects addMember on a DM; re-adding a left member rejoins", async () => {
    const dm = await createDirectConversation(alice.id, bob.id);
    await expect(addMember(alice.id, dm.conversationId, carol.id)).rejects.toMatchObject({
      status: 400,
      message: "Cannot add members to a direct conversation",
    });

    const { conversationId } = await createGroup(alice.id, "g", [bob.id]);
    await expect(addMember(alice.id, conversationId, bob.id)).rejects.toMatchObject({
      status: 409,
    });
    await leaveConversation(bob.id, conversationId);
    await addMember(alice.id, conversationId, bob.id);
    const member = await assertMembership(conversationId, bob.id);
    expect(member.leftAt).toBeNull();
  });
});

describe("getConversation", () => {
  it("returns summary + members with lastSeenAt", async () => {
    const { conversationId } = await createGroup(alice.id, "Dev Chat", [bob.id, carol.id]);
    const detail = await getConversation(alice.id, conversationId);
    expect(detail.name).toBe("Dev Chat");
    expect(detail.members).toHaveLength(3);
    for (const m of detail.members) {
      expect(m).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        image: null,
        role: expect.stringMatching(/owner|member/),
        lastSeenAt: null,
      });
    }
    expect(detail.members.find((m) => m.id === alice.id)?.role).toBe("owner");
  });
});

describe("markRead", () => {
  it("updates lastReadMessageId for the actor", async () => {
    const { conversationId } = await createGroup(alice.id, "g", [bob.id]);
    await markRead(bob.id, conversationId, "msg-42");
    const db = await readyDb();
    const bobRow = (
      await db
        .select()
        .from(conversationMembers)
        .where(eq(conversationMembers.conversationId, conversationId))
    ).find((r) => r.userId === bob.id);
    expect(bobRow?.lastReadMessageId).toBe("msg-42");
  });

  it("rejects empty messageId and non-members", async () => {
    const { conversationId } = await createGroup(alice.id, "g", []);
    await expect(markRead(alice.id, conversationId, "")).rejects.toMatchObject({ status: 400 });
    await expect(markRead(dan.id, conversationId, "m")).rejects.toMatchObject({ status: 403 });
  });
});
