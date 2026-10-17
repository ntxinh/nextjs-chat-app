# Observability

## Tracing (OpenTelemetry)

- `src/instrumentation.ts` calls `registerOTel({ serviceName: "nextjs-chat-app" })` on the Node runtime, **only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set**. Unset → `withSpan` runs on the OTel no-op tracer, zero overhead, nothing exported.
- `src/lib/observability/tracer.ts` `withSpan(name, attrs, fn)` wraps the service boundary (`sendMessage`, `createDirectConversation`, `createGroup`, `listMessages`): records exceptions, sets span status OK/ERROR, ends in `finally`.
- Span attributes carry **counts/lengths only** (`bodyLength`, `memberCount`, `limit`) — never user ids, conversation ids, or message content.

## Local collector

```bash
docker run -p 4318:4318 otel/opentelemetry-collector
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev
```

Spans appear in the collector logs. Point the same env var at Tempo/Jaeger/Honeycomb's OTLP endpoint for a real backend. Unset the var → nothing is exported.

## Vercel

`@vercel/otel` exports to Vercel's OTLP endpoint automatically on deploy. Limits: Node runtime only (no Edge), trace/span retention follows the Vercel plan tier, and high-cardinality attributes get dropped — another reason attrs stay count-only.

## Logging

Pino per design doc §7 — `LOG_LEVEL` env, redact `password`/`authorization`/`cookie`, never log message bodies.

_Last verified: 2026-10-17, Task 27 — tracing implemented._
