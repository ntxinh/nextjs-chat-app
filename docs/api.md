# API

**Status: not implemented — lands Phase 5.** No route handlers exist yet.

## Chosen approach (design doc §4)

- Public REST API under `/api/v1`: `me`, `users`, `conversations`, `members`, `read`, `messages` (spec §8 set). Auth lives under Better Auth's own `/api/auth/*`.
- Route Handlers and Server Actions share the same services → consistent `{ data }` / `{ error: { code, message } }` responses.
- Zod validation at the boundary; authorization in `src/server/policies/`.
- Cursor pagination: opaque base64 of `(createdAt, id)`; stable ordering.
- OpenAPI 3.1 JSON generated from the same Zod schemas via `zod-openapi` at `GET /api/v1/openapi.json`; Scalar UI at `/api-docs` (dev only). CI regenerates and diffs to catch drift.
- Rate limiting: in-memory sliding window on auth + message POST routes — per-instance on serverless (see `docs/decisions/0003-in-memory-rate-limit.md`).

_Last verified: 2026-10-17, Phase 1 — no API code exists yet._
