import "server-only";
import { createClient } from "@libsql/client";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { LibSQLTransaction } from "drizzle-orm/libsql";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { env } from "@/lib/env";
import * as schema from "./schema";

const client = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
const pragmaReady = client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle(client, { schema });

/** Schema object passed to `drizzle()` — single source for typed executors below. */
export type DbSchema = typeof schema;

/** Named executor types — services/repos annotate params with `DbOrTx`, never `typeof db`. */
export type Db = LibSQLDatabase<DbSchema>;
export type DbTx = LibSQLTransaction<DbSchema, ExtractTablesWithRelations<DbSchema>>;
export type DbOrTx = Db | DbTx;

/**
 * Repository functions: call `await readyDb()` as the first line — it resolves
 * once the FK pragma lands and returns `db`. Required before the first query.
 */
export async function readyDb() {
  await pragmaReady;
  return db;
}
