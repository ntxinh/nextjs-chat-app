# ADR 0001: Better Auth credentials

- Status: Accepted (decision made 2026-10-17; implementation lands Phase 2)
- Source: `docs/superpowers/specs/2026-10-17-chat-app-design.md` Decisions log

## Decision

> Auth → **Better Auth credentials** — DB sessions + hashing + CSRF handled; least code for credentials-only.

## Context

The spec requires a maintained auth library compatible with Next.js 16, Drizzle, and SQLite, with the selection and trade-offs documented. Registration is credentials-only (email + display name + password); no OAuth, magic links, or email verification in MVP.

## Consequences

- Database-backed sessions (revocable); Auth.js credentials mode would force JWT-only sessions.
- Better Auth Drizzle adapter emits `user`, `account`, `session`, `verification` tables; app fields extend `user`.
- Auth endpoints are Better Auth's own (`/api/auth/*`).
- Password hashing, CSRF on auth routes, and cookie flags are handled by the library.
