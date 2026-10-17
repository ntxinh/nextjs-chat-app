import { Writable } from "node:stream";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { withError } from "@/lib/api/respond";
import { withLogging } from "@/lib/api/with-logging";
import { AppError } from "@/lib/errors/app-error";
import { loggerOptions } from "@/lib/logging/logger";
import { getLogger, getRequestId } from "@/lib/logging/request-context";

/** Logger writing one JSON line per record into `lines`. */
function captureLogger() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(JSON.parse(chunk.toString()));
      cb();
    },
  });
  return { lines, log: pino(loggerOptions(), stream) };
}

describe("logger", () => {
  it("redacts passwords, tokens, and auth headers", () => {
    const { lines, log } = captureLogger();
    log.info({
      password: "hunter2",
      nested: { token: "tok_abc" },
      req: { headers: { authorization: "Bearer secret", cookie: "session=xyz" } },
    });
    const line = JSON.stringify(lines[0]);
    expect(line).not.toContain("hunter2");
    expect(line).not.toContain("tok_abc");
    expect(line).not.toContain("Bearer secret");
    expect(line).not.toContain("session=xyz");
    expect(line).toContain("[redacted]");
  });
});

describe("withLogging", () => {
  it("logs requestId, method, path, status, durationMs", async () => {
    const { lines, log } = captureLogger();
    const req = new Request("http://localhost/api/v1/me?x=1", {
      headers: { "x-request-id": "req-123" },
    });
    const res = await withLogging(
      async (_req: Request) => Response.json({ ok: true }, { status: 200 }),
      log,
    )(req);
    expect(res.status).toBe(200);
    expect(lines[0]).toMatchObject({
      requestId: "req-123",
      method: "GET",
      path: "/api/v1/me",
      status: 200,
      level: 30,
    });
    expect(lines[0].durationMs).toBeTypeOf("number");
  });

  it("propagates requestId to service code through the context logger", async () => {
    const { lines, log } = captureLogger();
    let seen: string | undefined;
    await withLogging(async (_req: Request) => {
      seen = getRequestId();
      getLogger().info("service log");
      return Response.json({});
    }, log)(new Request("http://localhost/api/v1/conversations"));
    const serviceLine = lines.find((l) => l.msg === "service log");
    expect(seen).toBeTruthy();
    expect(serviceLine?.requestId).toBe(seen);
    expect(getRequestId()).toBeUndefined();
  });

  it("logs the request and maps AppError through withError unchanged", async () => {
    const { lines, log } = captureLogger();
    const res = await withLogging(
      withError(async (_req: Request) => {
        throw new AppError(401, "unauthorized", "Authentication required");
      }),
      log,
    )(new Request("http://localhost/api/v1/me"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "unauthorized", message: "Authentication required" },
    });
    expect(lines[0]).toMatchObject({ status: 401, level: 30, path: "/api/v1/me" });
  });

  it("logs at error level for 5xx responses", async () => {
    const { lines, log } = captureLogger();
    await withLogging(
      async (_req: Request) => new Response("boom", { status: 500 }),
      log,
    )(new Request("http://localhost/x"));
    expect(lines[0]).toMatchObject({ status: 500, level: 50 });
  });
});
