import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
    token: process.env.DATABASE_AUTH_TOKEN,
  },
});
