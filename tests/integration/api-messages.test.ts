import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET as listMessagesRoute,
  POST as sendMessageRoute,
} from "@/app/api/v1/conversations/[conversationId]/messages/route";
import {
  DELETE as deleteMessageRoute,
  PATCH as patchMessage,
} from "@/app/api/v1/messages/[messageId]/route";
import type { AuthUser } from "@/lib/auth";
import { readyDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { requireApiUser } from "@/server/policies/auth";
import { createGroup } from "@/server/services/conversations";
import { sendMessage } from "@/server/services/messages";
import { resetDb } from "./helpers";

// Auth boundary mocked — same as api-conversations.test.ts: tests verify the
// route layer (validation, envelope, status codes, rate limit, service wiring).
vi.mock("@/server/policies/auth", () => ({ requireApiUser: vi.fn() }));

const USERS = [
  { id: "u-alice", name: "Alice", email: "alice@x.dev" },
  { id: "u-bob", name: "Bob", email: "bob@x.dev" },
  { id: "u-carol", name: "Carol", email: "carol@x.dev" },
  { id: "u-rl", name: "Rate Limited", email: "rl@x.dev" },
];
const [alice, bob, carol, rl] = USERS;

const me = vi.mocked(requireApiUser);
const asUser = (u: (typeof USERS)[number]) => me.mockResolvedValue(u as AuthUser);

function req(url: string, init?: { method?: string; body?: unknown }): NextRequest {
  return new NextRequest(`http://test${url}`, {
    method: init?.method ?? "GET",
    ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    headers: { "content-type": "application/json" },
  });
}
const convCtx = (conversationId: string) => ({ params: Promise.resolve({ conversationId }) });
const msgCtx = (messageId: string) => ({ params: Promise.resolve({ messageId }) });
const json = async (res: Response) => ({ status: res.status, body: await res.json() });
const messagesUrl = (convId: string, qs = "") => `/api/v1/conversations/${convId}/messages${qs}`;

let convId: string;
let rlConvId: string;

beforeEach(async () => {
  me.mockReset();
  const db = await readyDb();
  await resetDb();
  await db.insert(user).values(USERS);
  convId = (await createGroup(alice.id, "G", [bob.id])).conversationId;
  // Dedicated rate-limit user's conversation — 60-message budget stays isolated.
  rlConvId = (await createGroup(rl.id, "RL", [bob.id])).conversationId;
});

describe("GET /conversations/{id}/messages", () => {
  it("pages members' messages with nextCursor", async () => {
    asUser(alice);
    for (let i = 0; i < 5; i++) {
      await sendMessage(convId, alice.id, `msg ${i}`);
    }

    const page1 = await json(
      await listMessagesRoute(req(`${messagesUrl(convId)}?limit=2`), convCtx(convId)),
    );
    expect(page1.status).toBe(200);
    expect(page1.body.data.items).toHaveLength(2);
    expect(page1.body.data.nextCursor).toBeTypeOf("string");

    const page2 = await json(
      await listMessagesRoute(
        req(
          `${messagesUrl(convId)}?limit=2&cursor=${encodeURIComponent(page1.body.data.nextCursor)}`,
        ),
        convCtx(convId),
      ),
    );
    expect(page2.status).toBe(200);
    expect(page2.body.data.items).toHaveLength(2);
    const ids1 = page1.body.data.items.map((m: { id: string }) => m.id);
    const ids2 = page2.body.data.items.map((m: { id: string }) => m.id);
    expect([...ids1, ...ids2]).toHaveLength(new Set([...ids1, ...ids2]).size);

    const last = await json(
      await listMessagesRoute(
        req(
          `${messagesUrl(convId)}?limit=2&cursor=${encodeURIComponent(page2.body.data.nextCursor)}`,
        ),
        convCtx(convId),
      ),
    );
    expect(last.body.data.items).toHaveLength(1);
    expect(last.body.data.nextCursor).toBeNull();
  });

  it("rejects non-members with 403", async () => {
    asUser(carol);
    const res = await json(await listMessagesRoute(req(messagesUrl(convId)), convCtx(convId)));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("forbidden");
  });

  it("404s unknown conversations", async () => {
    asUser(alice);
    const res = await listMessagesRoute(req(messagesUrl("no-such-conv")), convCtx("no-such-conv"));
    expect(res.status).toBe(404);
  });

  it.each(["limit=0", "limit=101", "limit=abc"])("rejects invalid %s", async (qs) => {
    asUser(alice);
    const res = await listMessagesRoute(req(`${messagesUrl(convId)}?${qs}`), convCtx(convId));
    expect(res.status).toBe(400);
  });

  it("rejects a bogus cursor", async () => {
    asUser(alice);
    const res = await listMessagesRoute(
      req(`${messagesUrl(convId)}?cursor=not-a-cursor`),
      convCtx(convId),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /conversations/{id}/messages", () => {
  const post = (convIdParam: string, body: unknown) =>
    sendMessageRoute(req(messagesUrl(convIdParam), { method: "POST", body }), convCtx(convIdParam));

  it("creates a message for members with 201", async () => {
    asUser(alice);
    const res = await json(await post(convId, { body: "hello", clientMessageId: "cmid-00001" }));
    expect(res.status).toBe(201);
    expect(res.body.data.body).toBe("hello");
    expect(res.body.data.sender.id).toBe(alice.id);
    expect(res.body.data.conversationId).toBe(convId);
  });

  it("replays the same clientMessageId as 200 with the same message", async () => {
    asUser(alice);
    const payload = { body: "idempotent", clientMessageId: "cmid-00002" };
    const first = await json(await post(convId, payload));
    const replay = await json(await post(convId, payload));
    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(first.body.data.id);
  });

  it("rejects non-members with 403", async () => {
    asUser(carol);
    const res = await post(convId, { body: "hi", clientMessageId: "cmid-00003" });
    expect(res.status).toBe(403);
  });

  it("rejects a 4001-char body and missing clientMessageId with 400", async () => {
    asUser(alice);
    const tooLong = await json(
      await post(convId, { body: "x".repeat(4001), clientMessageId: "cmid-00004" }),
    );
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.code).toBe("validation_error");

    const noCmid = await post(convId, { body: "hi" });
    expect(noCmid.status).toBe(400);

    const shortCmid = await post(convId, { body: "hi", clientMessageId: "short" });
    expect(shortCmid.status).toBe(400);
  });

  it("rate limits the 61st message per user per minute", async () => {
    asUser(rl);
    for (let i = 0; i < 60; i++) {
      const res = await post(rlConvId, {
        body: `m${i}`,
        clientMessageId: `rl-cmid-${String(i).padStart(4, "0")}`,
      });
      expect(res.status).toBe(201);
    }
    const res = await json(
      await post(rlConvId, { body: "one too many", clientMessageId: "rl-cmid-0060" }),
    );
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("rate_limited");
  });
});

describe("PATCH /messages/{id}", () => {
  it("lets the author edit, sets editedAt", async () => {
    const { message } = await sendMessage(convId, alice.id, "original");
    asUser(alice);
    const res = await json(
      await patchMessage(
        req(`/api/v1/messages/${message.id}`, { method: "PATCH", body: { body: "edited" } }),
        msgCtx(message.id),
      ),
    );
    expect(res.status).toBe(200);
    expect(res.body.data.body).toBe("edited");
    expect(res.body.data.editedAt).not.toBeNull();
  });

  it("rejects non-authors with 403", async () => {
    const { message } = await sendMessage(convId, alice.id, "mine");
    asUser(bob);
    const res = await patchMessage(
      req(`/api/v1/messages/${message.id}`, { method: "PATCH", body: { body: "hijack" } }),
      msgCtx(message.id),
    );
    expect(res.status).toBe(403);
  });

  it("410s edits of deleted messages; 404s unknown ids", async () => {
    const { message } = await sendMessage(convId, alice.id, "doomed");
    asUser(alice);
    await deleteMessageRoute(
      req(`/api/v1/messages/${message.id}`, { method: "DELETE" }),
      msgCtx(message.id),
    );
    const gone = await patchMessage(
      req(`/api/v1/messages/${message.id}`, { method: "PATCH", body: { body: "revive" } }),
      msgCtx(message.id),
    );
    expect(gone.status).toBe(410);
    const missing = await patchMessage(
      req("/api/v1/messages/no-such", { method: "PATCH", body: { body: "x" } }),
      msgCtx("no-such"),
    );
    expect(missing.status).toBe(404);
  });
});

describe("DELETE /messages/{id}", () => {
  it("soft-deletes for the author; second delete 410s", async () => {
    const { message } = await sendMessage(convId, alice.id, "bye");
    asUser(alice);
    const first = await json(
      await deleteMessageRoute(
        req(`/api/v1/messages/${message.id}`, { method: "DELETE" }),
        msgCtx(message.id),
      ),
    );
    expect(first.status).toBe(200);
    expect(first.body.data.deleted).toBe(true);
    expect(first.body.data.body).toBe("");
    const second = await deleteMessageRoute(
      req(`/api/v1/messages/${message.id}`, { method: "DELETE" }),
      msgCtx(message.id),
    );
    expect(second.status).toBe(410);
  });

  it("rejects non-authors with 403", async () => {
    const { message } = await sendMessage(convId, alice.id, "not yours");
    asUser(bob);
    const res = await deleteMessageRoute(
      req(`/api/v1/messages/${message.id}`, { method: "DELETE" }),
      msgCtx(message.id),
    );
    expect(res.status).toBe(403);
  });
});
