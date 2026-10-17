import { conversationParams } from "@/lib/api/params";
import { ok, withError } from "@/lib/api/respond";
import { markReadSchema } from "@/lib/validation/conversations";
import { requireApiUser } from "@/server/policies/auth";
import * as svc from "@/server/services/conversations";

export const POST = withError(
  async (req: Request, ctx: { params: Promise<{ conversationId: string }> }) => {
    const me = await requireApiUser();
    const { conversationId } = conversationParams.parse(await ctx.params);
    const { messageId } = markReadSchema.parse(await req.json().catch(() => null));
    await svc.markRead(me.id, conversationId, messageId);
    return ok({ ok: true });
  },
);
