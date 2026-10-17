import { conversationParams } from "@/lib/api/params";
import { ok, withError } from "@/lib/api/respond";
import { requireApiUser } from "@/server/policies/auth";
import * as svc from "@/server/services/conversations";

export const DELETE = withError(
  async (_req: Request, ctx: { params: Promise<{ conversationId: string }> }) => {
    const me = await requireApiUser();
    const { conversationId } = conversationParams.parse(await ctx.params);
    await svc.leaveConversation(me.id, conversationId);
    return ok({ ok: true });
  },
);
