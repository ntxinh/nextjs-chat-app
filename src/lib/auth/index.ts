import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
  user: {
    additionalFields: {
      // timestamp_ms columns → JS Date values via drizzle adapter.
      deletedAt: { type: "date", required: false, input: false },
      lastSeenAt: { type: "date", required: false, input: false },
    },
    deleteUser: { enabled: true },
  },
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];
