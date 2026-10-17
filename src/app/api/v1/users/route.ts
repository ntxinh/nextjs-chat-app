import type { NextRequest } from "next/server";
import { ok, withError } from "@/lib/api/respond";
import { readyDb } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { userSearchQuerySchema } from "@/lib/validation/users";
import { requireApiUser } from "@/server/policies/auth";
import { rateLimit } from "@/server/policies/rate-limit";
import { searchUsers } from "@/server/repositories/users";

export const GET = withError(async (req: NextRequest) => {
  const me = await requireApiUser();
  if (!rateLimit(`${me.id}:user-search`, 30, 60_000)) {
    throw new AppError(429, "rate_limited", "Too many searches — slow down");
  }
  const q = userSearchQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const db = await readyDb();
  const items = await searchUsers(db, { query: q.query, excludeId: me.id, limit: q.limit });
  return ok({ items });
});
