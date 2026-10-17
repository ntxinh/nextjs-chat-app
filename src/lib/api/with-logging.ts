import "server-only";
import { logger } from "@/lib/logging/logger";
import { requestContext } from "@/lib/logging/request-context";

/**
 * Wraps a route handler: assigns a requestId (honoring `x-request-id` when
 * present), runs the handler inside AsyncLocalStorage so service code reaches
 * the request-bound child logger via `getLogger()`, and logs one line per
 * request — `{requestId, method, path, status, durationMs}` at info, at error
 * when the response is 5xx or the handler throws (error then re-thrown).
 */
export function withLogging<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
  base = logger,
) {
  return async (...args: T): Promise<Response> => {
    const req = args[0] instanceof Request ? args[0] : undefined;
    const requestId = req?.headers.get("x-request-id") ?? crypto.randomUUID();
    const method = req?.method ?? "UNKNOWN";
    const path = req ? new URL(req.url).pathname : "unknown";
    const started = performance.now();
    const log = base.child({ requestId });

    return requestContext.run({ requestId, log }, async () => {
      try {
        const res = await handler(...args);
        const fields = {
          requestId,
          method,
          path,
          status: res.status,
          durationMs: Math.round(performance.now() - started),
        };
        if (res.status >= 500) log.error(fields, "request failed");
        else log.info(fields, "request completed");
        return res;
      } catch (err) {
        log.error(
          {
            requestId,
            method,
            path,
            status: 500,
            durationMs: Math.round(performance.now() - started),
            err,
          },
          "request error",
        );
        throw err;
      }
    });
  };
}
