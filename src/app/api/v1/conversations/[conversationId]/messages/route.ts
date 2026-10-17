import type { NextRequest } from "next/server";
import { conversationParams } from "@/lib/api/params";
import { ok, withError } from "@/lib/api/respond";
import { withLogging } from "@/lib/api/with-logging";
import { AppError } from "@/lib/errors/app-error";
import { listMessagesQuery, sendMessageSchema } from "@/lib/validation/messages";
import { requireApiUser } from "@/server/policies/auth";
import { rateLimit } from "@/server/policies/rate-limit";
import * as svc from "@/server/services/messages";

export const GET = withLogging(
  withError(async (req: NextRequest, ctx: { params: Promise<{ conversationId: string }> }) => {
    const me = await requireApiUser();
    const { conversationId } = conversationParams.parse(await ctx.params);
    const q = listMessagesQuery.parse(Object.fromEntries(req.nextUrl.searchParams));
    return ok(await svc.listMessages(me.id, conversationId, q.cursor, q.limit));
  }),
);

export const POST = withLogging(
  withError(async (req: NextRequest, ctx: { params: Promise<{ conversationId: string }> }) => {
    const me = await requireApiUser();
    const { conversationId } = conversationParams.parse(await ctx.params);
    const body = sendMessageSchema.parse(await req.json().catch(() => null));
    if (!rateLimit(`${me.id}:send-message`, 60, 60_000)) {
      throw new AppError(429, "rate_limited", "Too many messages");
    }
    const { message, deduplicated } = await svc.sendMessage(
      conversationId,
      me.id,
      body.body,
      body.clientMessageId,
    );
    return ok(message, deduplicated ? 200 : 201);
  }),
);
