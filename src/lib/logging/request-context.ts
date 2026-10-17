import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";
import { logger } from "@/lib/logging/logger";

interface RequestContext {
  requestId: string;
  log: Logger;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

/** Request-bound child logger inside a `withLogging` scope; root logger elsewhere. */
export function getLogger(): Logger {
  return requestContext.getStore()?.log ?? logger;
}
