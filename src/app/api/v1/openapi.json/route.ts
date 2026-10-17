import "server-only";
import { NextResponse } from "next/server";
import { withError } from "@/lib/api/respond";
import { withLogging } from "@/lib/api/with-logging";
import { buildOpenApiDocument } from "@/lib/openapi/document";

const document = buildOpenApiDocument();

export const GET = withLogging(
  withError(async () =>
    NextResponse.json(document, {
      headers: { "cache-control": "public, max-age=3600" },
    }),
  ),
);
