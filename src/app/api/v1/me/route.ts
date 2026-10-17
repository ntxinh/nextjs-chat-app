import { eq } from "drizzle-orm";
import { apiError, ok, withError } from "@/lib/api/respond";
import { withLogging } from "@/lib/api/with-logging";
import { readyDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { patchMeSchema } from "@/lib/validation/me";
import { requireApiUser } from "@/server/policies/auth";

const meFields = {
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  lastSeenAt: user.lastSeenAt,
};

export const GET = withLogging(
  withError(async () => {
    const me = await requireApiUser();
    return ok({
      id: me.id,
      name: me.name,
      email: me.email,
      image: me.image ?? null,
      lastSeenAt: me.lastSeenAt ?? null,
    });
  }),
);

export const PATCH = withLogging(
  withError(async (req: Request) => {
    const me = await requireApiUser();
    const input = patchMeSchema.parse(await req.json().catch(() => null));

    const set = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
    };
    const db = await readyDb();
    if (Object.keys(set).length === 0) {
      const row = await db.query.user.findFirst({
        columns: { id: true, name: true, email: true, image: true, lastSeenAt: true },
        where: eq(user.id, me.id),
      });
      return row ? ok(row) : apiError(404, "not_found", "User not found");
    }
    const rows = await db.update(user).set(set).where(eq(user.id, me.id)).returning(meFields);
    return rows[0] ? ok(rows[0]) : apiError(404, "not_found", "User not found");
  }),
);
