# Chat App Design — Next.js 16 + Turso

Approved 2026-10-17. Source requirements: `docs/specs.md`.

## 1. Scope

Full-stack chat app for educational purposes: credentials auth, DMs + groups,
polling-based messaging, en/vi i18n, light/dark/system theme, OpenAPI+Scalar
API docs, Pino+OTel observability, Vitest+Playwright tests, GitHub Actions CI,
Vercel deploy. Non-goals per spec §1 (no calls, E2E encryption, uploads, push,
SSO, microservices, message brokers).

## 2. Authentication — Better Auth

- Credentials-only: `emailAndPassword`. Registration takes email + display name
  + password; no OAuth, magic links, or email verification in MVP.
- Database-backed sessions (revocable; Auth.js credentials mode would force
  JWT-only). Cookie: httpOnly, secure+sameSite=lax in prod.
- Better Auth Drizzle adapter emits `user`, `account`, `session`,
  `verification` tables. App fields on `user`: `displayName`, `avatarUrl`,
  `deletedAt` (soft delete), `lastSeenAt` (presence approximation).
- `normalizedEmail` uniqueness enforced at DB level (case-insensitive unique).
- Dev seed accounts via `make db-seed` only. No default prod credentials.
- Passwords hashed by the library; hashes never leave the server boundary.
  Server never trusts client-supplied user IDs — session is the identity.

## 3. Data model (Drizzle + Turso/libSQL)

IDs: `text` (uuid v7). Timestamps: integer UTC ms. FK enforcement verified on
connect (`PRAGMA foreign_keys = ON`).

| Table | Key fields / constraints |
|---|---|
| `user` | Better Auth base + `displayName`, `avatarUrl`, `normalizedEmail` (unique), `deletedAt`, `lastSeenAt` |
| `account`, `session`, `verification` | Better Auth generated |
| `conversations` | `type` (`direct`\|`group`), `name` (null for DM), `createdBy`, `createdAt`, `updatedAt` |
| `conversation_members` | PK `(conversationId, userId)`, `role` (`owner`\|`member`), `joinedAt`, `lastReadMessageId` (null), `leftAt` (null) |
| `direct_conversation_pairs` | `userA` < `userB` normalized, unique `(userA, userB)` → `conversationId`. DB constraint prevents dup DMs, not app code |
| `messages` | `conversationId`, `senderId`, `body` (≤4000 chars), `createdAt`, `editedAt`, `deletedAt`, `clientMessageId`; unique `(senderId, clientMessageId)` for idempotency; index `(conversationId, createdAt, id)` |

Unread = count of messages with `createdAt`/`id` after member's
`lastReadMessageId`. No separate receipts table — `lastReadMessageId` is the
conversation-level read state the spec asks for.

Soft-delete semantics: `messages.deletedAt` → rendered as deleted, body
retained; `conversation_members.leftAt` → member loses access, history kept.
Owner leaving transfers ownership to the longest-joined remaining member; a
group is deleted when its last member leaves. DM members can also leave.

## 4. Server layer & API

```
Route handler (/api/v1)  ─┐
                          ├─ Zod validate → policies/ authorize → services/
Server Action            ─┘                    ↓
                                     repositories/ → Drizzle
                          → { data } or { error: { code, message } }
```

- Both entry paths call the same services — no duplicated business logic.
- `policies/`: membership check, role check (owner renames/adds; anyone leaves;
  sender-only edit/delete). Single place authorization lives.
- Cursor pagination: opaque base64 of `(createdAt, id)`; stable ordering, no
  timestamp-only ordering.
- Endpoints: spec §8 set under `/api/v1` (`me`, `users`, `conversations`,
  `members`, `read`, `messages`). Auth endpoints are Better Auth's own
  (`/api/auth/*`) — no competing login routes.
- OpenAPI 3.1 JSON generated from the same Zod schemas via `zod-openapi` at
  `GET /api/v1/openapi.json`. Scalar UI at `/api-docs`, dev-only. CI regenerates
  and diffs to catch drift.
- Rate limiting: in-memory sliding window on auth + message POST routes.
  Documented limitation: per-instance on serverless; upgrade to Redis/Upstash
  if real enforcement needed.

## 5. Realtime — polling

- TanStack Query: 5s `refetchInterval` on open conversation, 15s on
  conversation list. Disabled when `document.hidden` or `navigator.onLine()===
  false`; bounded retry w/ backoff; dedup via `clientMessageId`.
- `POST /conversations/{id}/read` on view/poll → server updates
  `lastReadMessageId` → unread counts computed server-side.
- Optimistic send: message inserted with temp id + `clientMessageId`; on
  server response it's replaced; on failure rollback + retry affordance.
- Future realtime seam = invalidation boundary in query hooks; no bespoke
  provider abstraction until a provider exists.
- Presence: `lastSeenAt` throttled update on authenticated requests; shown as
  "last seen", never claimed as live presence.

## 6. Frontend

- `[locale]` segment, next-intl, en default + vi. All user-facing strings in
  `messages/*.json`; locale-aware date/time formatting.
- RSC for initial render + auth gating; Client Components only where
  interactive (composer, lists, dialogs).
- Zustand: panel collapse, composer drafts. Never copies server data.
- shadcn/ui + Tailwind; next-themes `attribute="class"`, system-aware, no
  hydration flash.
- Desktop: sidebar / conversation / collapsible details panel. Mobile: list
  screen ↔ conversation screen with back nav, safe-area aware composer.
- Sent vs received bubbles, edited/deleted markers, unread separator,
  skeletons, empty/error states, Enter send / Shift+Enter newline.
- WCAG 2.2 AA: semantic HTML, focus rings, aria labels, reduced-motion, no
  color-only status.

## 7. Observability & security

- Pino: pretty dev / JSON prod, `pino-http` request logs with request-id,
  redact `password`, `authorization`, `cookie`, no message bodies. `LOG_LEVEL`
  env; silent in tests.
- OTel via `@vercel/otel` + `registerOTel` in `instrumentation.ts`, Node
  runtime only (never Edge), env-gated exporter (OTLP), console exporter for
  local. No user IDs/message content as span attributes.
- Security headers incl. CSP in `next.config.ts`. CSRF: Better Auth handles
  for its routes; same-site cookies + origin checks for app mutations.
- Threat model + decisions documented in `docs/security.md`.

## 8. Testing

- Vitest unit: Zod schemas, policies, DM pair normalization, cursor codec,
  idempotency logic, error mapping.
- Vitest integration: real file-backed SQLite per run, migrations applied —
  DM uniqueness, ordering, pagination edges, authz failures, rollback.
- Playwright: spec §12 flows 1–15 — two-account messaging, persistence after
  reload, pagination, edit/delete, unauthorized access, group management,
  read states, locale switch, theme switch, mobile viewport.
- Deterministic data; await observable UI, no sleeps.

## 9. CI/CD

- One GitHub Actions workflow: mise → pnpm install (frozen lockfile, cache) →
  Biome check → `tsc` → vitest unit → vitest integration → `drizzle-kit check`
  → OpenAPI freshness diff → `next build` → Playwright.
- Deploy: Vercel Git integration (preview per PR, prod on main). Single deploy
  mechanism — no duplicate GH Actions deploy.
- `drizzle-kit migrate` = documented manual release step; never at app boot.

## 10. Docs

`AGENTS.md`, `README.md`, `DESIGN.md`, `docs/` set per spec §5/§14 written
against actual implementation, `docs/decisions/` ADRs for Better Auth choice,
polling tradeoffs, in-memory rate limiting.

## 11. Build order

Spec §17 phases 1–7. Foundation → DB+auth → conversations → messaging →
API+observability → test hardening → deployment. Each phase verified before
the next.

## Decisions log

| Decision | Choice | Why |
|---|---|---|
| Auth | Better Auth credentials | DB sessions + hashing + CSRF handled; least code for credentials-only |
| Dup DM prevention | `direct_conversation_pairs` unique constraint | Spec requires DB-level enforcement |
| Idempotency | `(senderId, clientMessageId)` unique | Retried sends can't duplicate |
| OpenAPI source | Zod → `zod-openapi` at runtime | Single source of truth, can't drift |
| Realtime | Polling only | Vercel serverless; no WS infra needed |
| Rate limit | In-memory per instance | Zero deps; documented ceiling |
