import { userParams } from "@/lib/api/params";
import { apiError, ok, withError } from "@/lib/api/respond";
import { readyDb } from "@/lib/db";
import { requireApiUser } from "@/server/policies/auth";
import { findPublicUser } from "@/server/repositories/users";

export const GET = withError(
  async (_req: Request, ctx: { params: Promise<{ userId: string }> }) => {
    await requireApiUser();
    const { userId } = userParams.parse(await ctx.params);
    const db = await readyDb();
    const found = await findPublicUser(db, userId);
    return found ? ok(found) : apiError(404, "not_found", "User not found");
  },
);
