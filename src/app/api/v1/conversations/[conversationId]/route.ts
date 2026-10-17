import { conversationParams } from "@/lib/api/params";
import { ok, withError } from "@/lib/api/respond";
import { renameConversationSchema } from "@/lib/validation/conversations";
import { requireApiUser } from "@/server/policies/auth";
import * as svc from "@/server/services/conversations";

export const GET = withError(
  async (_req: Request, ctx: { params: Promise<{ conversationId: string }> }) => {
    const me = await requireApiUser();
    const { conversationId } = conversationParams.parse(await ctx.params);
    return ok(await svc.getConversation(me.id, conversationId));
  },
);

export const PATCH = withError(
  async (req: Request, ctx: { params: Promise<{ conversationId: string }> }) => {
    const me = await requireApiUser();
    const { conversationId } = conversationParams.parse(await ctx.params);
    const { name } = renameConversationSchema.parse(await req.json().catch(() => null));
    await svc.renameGroup(me.id, conversationId, name);
    return ok(await svc.getConversation(me.id, conversationId));
  },
);
