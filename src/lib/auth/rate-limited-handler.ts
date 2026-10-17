import "server-only";
import { toNextJsHandler } from "better-auth/next-js";
import { withError } from "@/lib/api/respond";
import { withLogging } from "@/lib/api/with-logging";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/server/policies/rate-limit";

const inner = toNextJsHandler(auth.handler);

const RATE_LIMITED_PATHS = ["/api/auth/sign-in", "/api/auth/sign-up"];
const LIMIT = 10;
const WINDOW_MS = 60_000;

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon"
  );
}

async function post(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  if (
    RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p)) &&
    !rateLimit(clientIp(req), LIMIT, WINDOW_MS)
  ) {
    return Response.json(
      { error: { code: "rate_limited", message: "Too many attempts — try again later" } },
      { status: 429 },
    );
  }
  return inner.POST(req);
}

export const GET = withLogging(withError(inner.GET));
export const POST = withLogging(withError(post));
