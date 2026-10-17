import { conversationParams } from "@/lib/api/params";
import { ok, withError } from "@/lib/api/respond";
import { addMemberSchema } from "@/lib/validation/conversations";
import { requireApiUser } from "@/server/policies/auth";
import * as svc from "@/server/services/conversations";

export const POST = withError(
  async (req: Request, ctx: { params: Promise<{ conversationId: string }> }) => {
    const me = await requireApiUser();
    const { conversationId } = conversationParams.parse(await ctx.params);
    const { userId } = addMemberSchema.parse(await req.json().catch(() => null));
    await svc.addMember(me.id, conversationId, userId);
    return ok({ userId }, 201);
  },
);
