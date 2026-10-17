# Authentication

**Status: not implemented — lands Phase 2.** Decision recorded in `docs/decisions/0001-better-auth.md`.

## Chosen approach (design doc §2)

- Better Auth, credentials only (`emailAndPassword`): email + display name + password registration. No OAuth, magic links, or email verification in MVP.
- Database-backed sessions (revocable). Cookie: httpOnly, secure + `sameSite=lax` in production.
- Better Auth Drizzle adapter emits `user`, `account`, `session`, `verification` tables. App fields on `user`: `displayName`, `avatarUrl`, `deletedAt` (soft delete), `lastSeenAt`.
- `normalizedEmail` unique at the DB level (case-insensitive).
- Passwords hashed by the library; hashes never leave the server boundary. The session is the identity — the server never trusts client-supplied user IDs.
- Auth endpoints are Better Auth's own (`/api/auth/*`); the app adds no competing login routes.
- Dev seed accounts via `make db-seed` only; never a default production credential.

## Authorization model (lands with services)

- `src/server/policies/`: conversation-membership check, role check (owner renames/adds members; anyone leaves; sender-only edit/delete).
- Both Route Handlers and Server Actions authorize through the same policies before calling services.

## Environment (Phase 2+)

`BETTER_AUTH_SECRET` (required in prod), `BETTER_AUTH_URL` — see `.env.example`.

_Last verified: 2026-10-17, Phase 1 — no auth code exists yet._
