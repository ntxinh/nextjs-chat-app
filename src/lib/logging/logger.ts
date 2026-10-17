import "server-only";
import pino from "pino";
import { env } from "@/lib/env";

const redact: pino.LoggerOptions["redact"] = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "*.password",
    "*.token",
    "password",
    "token",
  ],
  censor: "[redacted]",
};

/** Same options as the singleton — lets tests point pino at an in-memory stream. */
export function loggerOptions(): pino.LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    redact,
    ...(env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {}),
  };
}

export const logger = pino(loggerOptions());
