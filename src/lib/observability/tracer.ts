import "server-only";
import { SpanStatusCode, trace } from "@opentelemetry/api";

const tracer = trace.getTracer("chat");

// No provider registered → no-op tracer, zero cost. registerOTel() in
// src/instrumentation.ts only runs when OTEL_EXPORTER_OTLP_ENDPOINT is set.
// attrs MUST NOT carry user ids or content — counts/lengths only.
export async function withSpan<T>(
  name: string,
  attrs: Record<string, string | number>,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      span.setAttributes(attrs);
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
