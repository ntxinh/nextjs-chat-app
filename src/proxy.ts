import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Per-request CSP nonce: App Router hydration ships inline scripts
// (self.__next_f.push), so bare `script-src 'self'` blocks hydration.
// Next parses `content-security-policy` from REQUEST headers to stamp its
// own scripts; 'strict-dynamic' extends trust to what they load.
export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
    }`,
    "connect-src 'self'",
  ].join("; ");
  // Next derives the script nonce by parsing CSP from the REQUEST headers —
  // set it before intl copies request headers into its rewrite/next response.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);
  const response = intl(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] };
