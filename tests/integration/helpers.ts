import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function resetDb() {
  // Hardcoded identifiers only — never interpolate user input into sql.raw.
  // Children before parents — FK-safe delete order.
  for (const t of [
    "direct_conversation_pairs",
    "conversation_members",
    "conversations",
    "verification",
    "session",
    "account",
    "user",
  ]) {
    await db.run(sql.raw(`DELETE FROM ${t}`));
  }
}
