import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  // Required in production — enforced at boot in src/instrumentation.ts register().
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
});

export const env = envSchema.parse(process.env);
