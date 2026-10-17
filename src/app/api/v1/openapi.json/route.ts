import "server-only";
import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi/document";

const document = buildOpenApiDocument();

export function GET() {
  return NextResponse.json(document, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
