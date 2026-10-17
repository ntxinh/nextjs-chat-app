import { type NextRequest, NextResponse } from "next/server";

// Stub until next-intl middleware lands (Task 3): only `/` → `/en`.
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/en", request.url));
  }
}

export const config = { matcher: "/" };
