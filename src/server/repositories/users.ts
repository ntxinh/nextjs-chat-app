import "server-only";
import { inArray } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { user } from "@/lib/db/schema";

export type UserRow = typeof user.$inferSelect;

export async function findUsersByIds(db: DbOrTx, ids: string[]): Promise<UserRow[]> {
  if (ids.length === 0) return [];
  return db.select().from(user).where(inArray(user.id, ids));
}
