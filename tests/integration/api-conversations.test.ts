import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE as leaveConversation } from "@/app/api/v1/conversations/[conversationId]/members/me/route";
import { POST as addMember } from "@/app/api/v1/conversations/[conversationId]/members/route";
import { POST as markRead } from "@/app/api/v1/conversations/[conversationId]/read/route";
import {
  GET as getConversation,
  PATCH as patchConversation,
} from "@/app/api/v1/conversations/[conversationId]/route";
import {
  POST as createConversation,
  GET as listConversations,
} from "@/app/api/v1/conversations/route";
import { GET as getUser } from "@/app/api/v1/users/[userId]/route";
import { GET as searchUsers } from "@/app/api/v1/users/route";
import type { AuthUser } from "@/lib/auth";
import { readyDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { AppError } from "@/lib/errors/app-error";
import { requireApiUser } from "@/server/policies/auth";
import { resetDb } from "./helpers";

// Auth boundary mocked — session plumbing is covered by better-auth; these
// tests verify the route layer (auth gate, validation, envelope, service wiring).
vi.mock("@/server/policies/auth", () => ({ requireApiUser: vi.fn() }));

const USERS = [
  { id: "u-alice", name: "Alice", email: "alice@x.dev" },
  { id: "u-bob", name: "Bob", email: "bob@x.dev" },
  { id: "u-carol", name: "Carol", email: "carol@x.dev" },
  { id: "u-dan", name: "Dan", email: "dan@x.dev" },
  { id: "u-pct", name: "100% legit", email: "pct@x.dev" },
  { id: "u-rl", name: "Rate Limited", email: "rl@x.dev" },
];
const [alice, bob, carol, dan, pct, rl] = USERS;

const me = vi.mocked(requireApiUser);
const asUser = (u: (typeof USERS)[number]) => me.mockResolvedValue(u as AuthUser);
const unauth = () =>
  me.mockRejectedValue(new AppError(401, "unauthorized", "Authentication required"));

function req(url: string, init?: { method?: string; body?: unknown }): NextRequest {
  return new NextRequest(`http://test${url}`, {
    method: init?.method ?? "GET",
    ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    headers: { "content-type": "application/json" },
  });
}
const convCtx = (conversationId: string) => ({ params: Promise.resolve({ conversationId }) });
const userCtx = (userId: string) => ({ params: Promise.resolve({ userId }) });
const json = async (res: Response) => ({ status: res.status, body: await res.json() });

beforeEach(async () => {
  me.mockReset();
  const db = await readyDb();
  await resetDb();
  await db.insert(user).values(USERS);
});

describe("auth gate + envelope", () => {
  it("rejects unauthenticated calls with the error envelope", async () => {
    unauth();
    const res = await listConversations(req("/api/v1/conversations"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "unauthorized", message: "Authentication required" },
    });
  });
});

describe("POST /conversations", () => {
  it("creates a DM (201) and dedups to 200 on repeat", async () => {
    asUser(alice);
    const first = await json(
      await createConversation(
        req("/api/v1/conversations", { method: "POST", body: { type: "direct", userId: bob.id } }),
      ),
    );
    expect(first.status).toBe(201);
    expect(first.body.data.created).toBe(true);

    asUser(bob);
    const second = await json(
      await createConversation(
        req("/api/v1/conversations", {
          method: "POST",
          body: { type: "direct", userId: alice.id },
        }),
      ),
    );
    expect(second.status).toBe(200);
    expect(second.body.data).toEqual({
      conversationId: first.body.data.conversationId,
      created: false,
    });
  });

  it("creates a group and validates the body", async () => {
    asUser(alice);
    const res = await json(
      await createConversation(
        req("/api/v1/conversations", {
          method: "POST",
          body: { type: "group", name: "Dev Chat", memberIds: [bob.id] },
        }),
      ),
    );
    expect(res.status).toBe(201);
    expect(res.body.data.conversationId).toEqual(expect.any(String));

    const bad = await createConversation(
      req("/api/v1/conversations", { method: "POST", body: { type: "direct" } }),
    );
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("validation_error");
  });
});

describe("GET /conversations", () => {
  it("lists memberships, respects limit, rejects bad params", async () => {
    asUser(alice);
    const dm = await json(
      await createConversation(
        req("/api/v1/conversations", { method: "POST", body: { type: "direct", userId: bob.id } }),
      ),
    );
    const convId = dm.body.data.conversationId as string;

    asUser(bob);
    const mine = await json(await listConversations(req("/api/v1/conversations")));
    expect(mine.status).toBe(200);
    const found = mine.body.data.items.find((c: { id: string }) => c.id === convId);
    expect(found).toMatchObject({ type: "direct", otherUser: { id: alice.id, name: "Alice" } });

    asUser(carol);
    const carols = await json(await listConversations(req("/api/v1/conversations")));
    expect(carols.body.data.items.find((c: { id: string }) => c.id === convId)).toBeUndefined();

    asUser(alice);
    expect((await listConversations(req("/api/v1/conversations?limit=0"))).status).toBe(400);
    expect((await listConversations(req("/api/v1/conversations?limit=abc"))).status).toBe(400);
    expect((await listConversations(req("/api/v1/conversations?cursor=garbage"))).status).toBe(400);
  });
});

describe("GET/PATCH /conversations/{id}", () => {
  async function makeGroup() {
    asUser(alice);
    const res = await json(
      await createConversation(
        req("/api/v1/conversations", {
          method: "POST",
          body: { type: "group", name: "G", memberIds: [bob.id] },
        }),
      ),
    );
    return res.body.data.conversationId as string;
  }

  it("returns detail for members, 403 for non-members, 404 for missing", async () => {
    const convId = await makeGroup();
    asUser(bob);
    const detail = await json(await getConversation(req(""), convCtx(convId)));
    expect(detail.status).toBe(200);
    expect(detail.body.data.members).toHaveLength(2);

    asUser(carol);
    expect((await getConversation(req(""), convCtx(convId))).status).toBe(403);
    expect((await getConversation(req(""), convCtx("nope"))).status).toBe(404);
  });

  it("renames only for the owner", async () => {
    const convId = await makeGroup();
    asUser(bob);
    const forbidden = await patchConversation(
      req("", { method: "PATCH", body: { name: "nope" } }),
      convCtx(convId),
    );
    expect(forbidden.status).toBe(403);

    asUser(alice);
    const renamed = await json(
      await patchConversation(
        req("", { method: "PATCH", body: { name: "Renamed" } }),
        convCtx(convId),
      ),
    );
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.name).toBe("Renamed");
  });
});

describe("POST /members + DELETE /members/me", () => {
  async function makeGroup() {
    asUser(alice);
    const res = await json(
      await createConversation(
        req("/api/v1/conversations", {
          method: "POST",
          body: { type: "group", name: "G", memberIds: [bob.id] },
        }),
      ),
    );
    return res.body.data.conversationId as string;
  }

  it("owner adds members; members and non-members are rejected", async () => {
    const convId = await makeGroup();
    asUser(bob);
    expect(
      (await addMember(req("", { method: "POST", body: { userId: dan.id } }), convCtx(convId)))
        .status,
    ).toBe(403);

    asUser(alice);
    const added = await json(
      await addMember(req("", { method: "POST", body: { userId: dan.id } }), convCtx(convId)),
    );
    expect(added.status).toBe(201);

    expect(
      (await addMember(req("", { method: "POST", body: { userId: dan.id } }), convCtx(convId)))
        .status,
    ).toBe(409);
    expect((await addMember(req("", { method: "POST", body: {} }), convCtx(convId))).status).toBe(
      400,
    );
  });

  it("leaving removes the conversation from the list and blocks detail", async () => {
    const convId = await makeGroup();
    asUser(bob);
    expect((await leaveConversation(req(""), convCtx(convId))).status).toBe(200);

    const mine = await json(await listConversations(req("/api/v1/conversations")));
    expect(mine.body.data.items.find((c: { id: string }) => c.id === convId)).toBeUndefined();
    expect((await getConversation(req(""), convCtx(convId))).status).toBe(403);
  });
});

describe("POST /read", () => {
  it("marks read for members; validates messageId", async () => {
    asUser(alice);
    const res = await json(
      await createConversation(
        req("/api/v1/conversations", {
          method: "POST",
          body: { type: "group", name: "G", memberIds: [bob.id] },
        }),
      ),
    );
    const convId = res.body.data.conversationId as string;

    asUser(bob);
    expect(
      (await markRead(req("", { method: "POST", body: { messageId: "m1" } }), convCtx(convId)))
        .status,
    ).toBe(200);
    expect(
      (await markRead(req("", { method: "POST", body: { messageId: "" } }), convCtx(convId)))
        .status,
    ).toBe(400);

    asUser(carol);
    expect(
      (await markRead(req("", { method: "POST", body: { messageId: "m1" } }), convCtx(convId)))
        .status,
    ).toBe(403);
  });
});

describe("GET /users", () => {
  it("searches by name, excludes self + soft-deleted, returns public fields", async () => {
    asUser(alice);
    const res = await json(await searchUsers(req("/api/v1/users?query=a")));
    expect(res.status).toBe(200);
    const names = res.body.data.items.map((u: { name: string }) => u.name);
    expect(names).toEqual(expect.arrayContaining(["Carol", "Dan", "Rate Limited"]));
    expect(names).not.toContain("Alice");
    for (const u of res.body.data.items) {
      expect(Object.keys(u).sort()).toEqual(["id", "image", "name"]);
    }

    const db = await readyDb();
    await db.update(user).set({ deletedAt: new Date() }).where(eq(user.id, dan.id));
    const after = await json(await searchUsers(req("/api/v1/users?query=dan")));
    expect(after.body.data.items).toHaveLength(0);

    expect((await searchUsers(req("/api/v1/users"))).status).toBe(400);
  });

  it("escapes LIKE wildcards", async () => {
    asUser(alice);
    const res = await json(await searchUsers(req("/api/v1/users?query=%25")));
    expect(res.body.data.items).toEqual([{ id: pct.id, name: "100% legit", image: null }]);
  });

  it("rate limits at 30 requests/minute", async () => {
    asUser(rl);
    for (let i = 0; i < 30; i++) {
      expect((await searchUsers(req("/api/v1/users?query=a"))).status).toBe(200);
    }
    const limited = await searchUsers(req("/api/v1/users?query=a"));
    expect(limited.status).toBe(429);
    expect((await limited.json()).error.code).toBe("rate_limited");
  });
});

describe("GET /users/{id}", () => {
  it("returns public fields; 404 on missing or deleted", async () => {
    asUser(alice);
    const res = await json(await getUser(req(""), userCtx(bob.id)));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: bob.id, name: "Bob", image: null });

    expect((await getUser(req(""), userCtx("nope"))).status).toBe(404);

    const db = await readyDb();
    await db.update(user).set({ deletedAt: new Date() }).where(eq(user.id, dan.id));
    expect((await getUser(req(""), userCtx(dan.id))).status).toBe(404);
  });
});
