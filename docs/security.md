# Security

## In place now

- Response headers (`next.config.ts`, applied to every route):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'` — `'unsafe-eval'` is appended to `script-src` only when `NODE_ENV=development` (React Refresh).
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Auth via Better Auth (`src/lib/auth/`); session cookie is httpOnly; `sameSite=lax`, `secure` in production.
- Every `/api/v1` handler goes through `requireApiUser()` (`src/server/policies/auth.ts`); identity comes from the session, never the request body.
- Authorization centralized in `src/server/policies/`; conversation/message access checks membership.
- Server validation with Zod on every request body/params (`src/lib/validation/`).
- Uniform `{data}` / `{error:{code,message}}` envelope via `src/lib/api/respond.ts`.
- Rate limiting: in-memory sliding window (`src/server/policies/rate-limit.ts`) on auth sign-in/sign-up (10/min per IP), message POST (60/min per user), and user search (30/min per user). Per-instance ceiling documented in `docs/decisions/0003-in-memory-rate-limit.md`.
- No secrets committed; `.env` is gitignored, `.env.example` holds placeholders only.
- Logging redaction: `password`, `authorization`, `cookie`; no message bodies or user IDs in spans (`docs/observability.md`).

## Threat model

### Session theft

- **Attack:** stolen session cookie via XSS, MitM, or log leakage.
- **Mitigations:** httpOnly cookie (unreadable from JS), `secure` + `sameSite=lax` in production, CSP `script-src 'self'` blocks injected script, `X-Frame-Options: DENY` prevents clickjacking, `Referrer-Policy` limits origin leakage in URLs, logging redacts `cookie`/`authorization` headers.
- **Residual:** no cookie `SameSite=Strict` (lax allows top-level GET navigations) — acceptable for a chat app; tighten if phishing flows appear.

### IDOR on conversations

- **Attack:** guessing IDs to read/write another user's conversations, messages, or members (`/api/v1/conversations/{id}/...`, `/api/v1/messages/{id}`, `/api/v1/users/{id}`).
- **Mitigations:** every handler calls `requireApiUser()`; membership checks in `src/server/policies/conversations.ts` / `messages.ts` run before repository access; user-facing IDs are opaque cuid/uuid, not sequential.
- **Residual:** none identified — there is no code path that trusts a client-supplied user ID for identity.

### XSS / content injection

- **Attack:** malicious message text or display name rendered as HTML/script.
- **Mitigations:** React escaping everywhere; `grep -rn dangerouslySetInnerHTML src` returns **zero matches** (verified 2026-10-17). CSP `script-src 'self'` is a second layer — injected inline scripts cannot execute.
- **Residual:** `style-src 'unsafe-inline'` is required by Next/Tailwind and is a known soft spot (CSS exfiltration is theoretical); `img-src https:` allows arbitrary remote images (tracking pixel concern, acceptable for MVP).

### CSRF

- **Attack:** cross-site form POST forging session-authenticated mutations.
- **Mitigations:** `sameSite=lax` cookies are not sent on cross-site POSTs; the app API consumes JSON (`Content-Type: application/json`), which requires a CORS preflight the browser will not send cross-origin without CORS headers (none are configured — default same-origin); Better Auth handles CSRF/origin checks on its own routes.
- **Residual:** GET endpoints are state-changing nowhere; verify any future mutation stays POST/PUT/DELETE + JSON.

### Rate limiting / abuse

- **Attack:** brute-force sign-in, message spam, user enumeration via search.
- **Mitigations:** sliding-window limiter — auth sign-in/sign-up 10/min per client IP (falls back through `x-forwarded-for`/`x-real-ip`), message POST 60/min per user, user search 30/min per user. Exceeding returns `{error:{code:"rate_limited",...}}` with 429.
- **Residual:** per-instance in-memory only — resets on redeploy and is not shared across instances (documented ceiling, ADR 0003). Upgrade path: Upstash Ratelimit behind the same call sites.

### Error leakage

- **Attack:** stack traces, Prisma internals, or schema details reaching clients via 500s.
- **Mitigations:** `withError` (`src/lib/api/respond.ts`) maps known `AppError`s to `{error:{code,message}}` and collapses unknowns to a generic envelope — no stack in the response; server-side logging keeps detail internally.
- **Residual:** Zod `issues` detail is intentionally returned on 400 to help the client — contains field names, not internals.

_Last verified: 2026-10-17, Phase 5._
