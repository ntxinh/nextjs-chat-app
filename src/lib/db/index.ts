import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "@/lib/env";
import * as schema from "./schema";

const client = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
const pragmaReady = client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle(client, { schema });

/**
 * Repository functions: call `await readyDb()` as the first line — it resolves
 * once the FK pragma lands and returns `db`. Required before the first query.
 */
export async function readyDb() {
  await pragmaReady;
  return db;
}
