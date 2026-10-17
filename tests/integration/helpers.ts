import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function resetDb() {
  // Hardcoded identifiers only — never interpolate user input into sql.raw.
  for (const t of ["verification", "session", "account", "user"]) {
    await db.run(sql.raw(`DELETE FROM ${t}`));
  }
}
