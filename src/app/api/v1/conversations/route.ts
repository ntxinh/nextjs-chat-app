import type { NextRequest } from "next/server";
import { ok, withError } from "@/lib/api/respond";
import { createConversationSchema, listQuerySchema } from "@/lib/validation/conversations";
import { requireApiUser } from "@/server/policies/auth";
import * as svc from "@/server/services/conversations";

export const GET = withError(async (req: NextRequest) => {
  const me = await requireApiUser();
  const q = listQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return ok(await svc.listConversations(me.id, q.cursor, q.limit));
});

export const POST = withError(async (req: NextRequest) => {
  const me = await requireApiUser();
  const body = createConversationSchema.parse(await req.json().catch(() => null));
  const result =
    body.type === "direct"
      ? await svc.createDirectConversation(me.id, body.userId)
      : await svc.createGroup(me.id, body.name, body.memberIds);
  const created = "created" in result ? result.created : true;
  return ok(result, created ? 201 : 200);
});
