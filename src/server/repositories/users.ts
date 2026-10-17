import "server-only";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { user } from "@/lib/db/schema";

export type UserRow = typeof user.$inferSelect;

export async function findUsersByIds(db: DbOrTx, ids: string[]): Promise<UserRow[]> {
  if (ids.length === 0) return [];
  return db.select().from(user).where(inArray(user.id, ids));
}

export type PublicUser = Pick<UserRow, "id" | "name" | "image">;

const publicUserFields = { id: user.id, name: user.name, image: user.image };

/** Escape LIKE wildcards (`%`, `_`, `\`) so user input can't widen the match. */
const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Name search for the user directory — never returns `actorId` or soft-deleted. */
export async function searchUsers(
  db: DbOrTx,
  { query, excludeId, limit }: { query: string; excludeId: string; limit: number },
): Promise<PublicUser[]> {
  const pattern = `%${escapeLike(query)}%`;
  return db
    .select(publicUserFields)
    .from(user)
    .where(
      and(
        isNull(user.deletedAt),
        ne(user.id, excludeId),
        sql`lower(${user.name}) like lower(${pattern}) escape '\\'`,
      ),
    )
    .limit(limit);
}

export async function findPublicUser(db: DbOrTx, id: string): Promise<PublicUser | undefined> {
  const rows = await db
    .select(publicUserFields)
    .from(user)
    .where(and(eq(user.id, id), isNull(user.deletedAt)))
    .limit(1);
  return rows[0];
}
