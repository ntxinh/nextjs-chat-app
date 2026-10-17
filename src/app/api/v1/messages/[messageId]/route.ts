import { messageParams } from "@/lib/api/params";
import { ok, withError } from "@/lib/api/respond";
import { withLogging } from "@/lib/api/with-logging";
import { editMessageSchema } from "@/lib/validation/messages";
import { requireApiUser } from "@/server/policies/auth";
import * as svc from "@/server/services/messages";

export const PATCH = withLogging(
  withError(async (req: Request, ctx: { params: Promise<{ messageId: string }> }) => {
    const me = await requireApiUser();
    const { messageId } = messageParams.parse(await ctx.params);
    const { body } = editMessageSchema.parse(await req.json().catch(() => null));
    return ok(await svc.editMessage(messageId, me.id, body));
  }),
);

export const DELETE = withLogging(
  withError(async (_req: Request, ctx: { params: Promise<{ messageId: string }> }) => {
    const me = await requireApiUser();
    const { messageId } = messageParams.parse(await ctx.params);
    return ok(await svc.deleteMessage(messageId, me.id));
  }),
);
