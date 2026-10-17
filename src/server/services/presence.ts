import "server-only";
import { eq } from "drizzle-orm";
import { readyDb } from "@/lib/db";
import { user } from "@/lib/db/schema";

// ponytail: per-instance in-memory throttle — resets on deploy and does not
// share across serverless instances; fine for best-effort "last seen".
const touched = new Map<string, number>();

/** Best-effort presence bump — at most one write per user per 60s. */
export async function touchLastSeen(userId: string): Promise<void> {
  const db = await readyDb();
  const now = Date.now();
  if (now - (touched.get(userId) ?? 0) < 60_000) return;
  touched.set(userId, now);
  await db
    .update(user)
    .set({ lastSeenAt: new Date(now) })
    .where(eq(user.id, userId));
}
