# Observability

**Status: not implemented — lands Phase 5.** No logging or tracing code exists yet.

## Chosen approach (design doc §7)

- Pino: pretty output in dev, JSON in prod; `pino-http` request logs with a request-id. Redact `password`, `authorization`, `cookie`; never log message bodies. `LOG_LEVEL` env controls level; silent in tests.
- OpenTelemetry via `@vercel/otel` + `registerOTel` in `instrumentation.ts`, Node runtime only (never Edge). OTLP exporter env-gated (`OTEL_EXPORTER_OTLP_ENDPOINT`); console exporter for local.
- No user IDs or message content as span attributes.

## Environment

`LOG_LEVEL` (`debug`/`info`/`warn`/`error`, default `info`), `OTEL_EXPORTER_OTLP_ENDPOINT` (optional) — see `.env.example`.

_Last verified: 2026-10-17, Phase 1 — no observability code exists yet._
