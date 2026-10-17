import { ApiReference } from "@scalar/nextjs-api-reference";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

// Dev-only: interactive API docs would leak the contract surface in production.
const docs = ApiReference({ url: "/api/v1/openapi.json" });

export function GET() {
  if (env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: { code: "not_found", message: "Not found" } },
      { status: 404 },
    );
  }
  return docs();
}
