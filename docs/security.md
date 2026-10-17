# Security

## In place now

- No auth, db, or API surface exists yet — the only routes are the localized app shell and `next-intl` middleware (which excludes `/api`, `/_next`, static files).
- `next.config.ts` is minimal; security headers incl. CSP land with the API work (design §7).
- No secrets committed; `.env` is gitignored, `.env.example` holds placeholders only.

## Rules that apply as features land

- Never store plaintext passwords or expose password hashes (Better Auth hashes; see `docs/authentication.md`).
- Session is the identity — never trust client-supplied user IDs.
- Authorization centralized in `src/server/policies/`; every conversation/message read+write checks membership.
- Server validate everything (Zod); never render user HTML (React escaping is the norm — no `dangerouslySetInnerHTML` on user content).
- Cookies: httpOnly, secure + `sameSite=lax` in production. CSRF: Better Auth handles its routes; same-site cookies + origin checks for app mutations.
- Rate limiting: in-memory sliding window on auth + message POST routes — per-instance ceiling documented in `docs/decisions/0003-in-memory-rate-limit.md`.
- Logging redaction: `password`, `authorization`, `cookie`; no message bodies, no user IDs in spans.
- Seed accounts are dev-only; never ship default production credentials.

## Threat model

To be written alongside the Phase 2 auth/db implementation (design §7 assigns it to this file).

_Last verified: 2026-10-17, Phase 1._
