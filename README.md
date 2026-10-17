# Chat App

Full-stack chat web application (educational) built on Next.js 16 App Router.
Requirements: `docs/specs.md`. Approved design: `docs/superpowers/specs/2026-10-17-chat-app-design.md`.

## Features

Done:

- Localized app shell — `en` (default) and `vi` routes via next-intl (`/en`, `/vi`).
- Chat layout: sidebar / conversation / collapsible details panel on desktop; list ↔ conversation single-pane navigation on mobile.
- Light / dark / system theme (next-themes, no hydration flash); design tokens in `DESIGN.md`.
- shadcn/ui component set (radix-nova), Tailwind 4.
- CI: Biome, typecheck, unit tests, build, Playwright smoke (desktop + mobile).

Planned (per spec §17 phases):

- Phase 2 — Drizzle + Turso database, Better Auth credentials registration/login.
- Phase 3 — DMs + group conversations, unread counts, user search.
- Phase 4 — messaging: pagination, edit/delete, optimistic send, polling refresh.
- Phase 5 — `/api/v1` REST + OpenAPI/Scalar docs, Pino logging, OTel tracing.
- Phase 6 — test hardening.
- Phase 7 — Vercel deployment.

## Stack

Next.js 16 + React 19 · TypeScript strict · Tailwind 4 + shadcn/ui · next-intl · next-themes · Biome · Vitest · Playwright · pnpm · mise. Planned: Drizzle + Turso, Better Auth, TanStack Query, Zustand, Pino, OpenTelemetry.

## Prerequisites

- [mise](https://mise.jdx.dev/) — installs Node 24 + pnpm 10 from `mise.toml`.

## Setup

```sh
mise install
pnpm install
cp .env.example .env   # optional for now — nothing consumes env vars yet
pnpm dev               # http://localhost:3000 → redirects to /en
```

## Environment variables

`.env.example` is the reference; copy to `.env` and fill in as features land.

| Variable | Purpose | Needed now |
|---|---|---|
| `DATABASE_URL` | libSQL/Turso URL (default local file `file:./dev.db`) | Phase 2 |
| `DATABASE_AUTH_TOKEN` | Auth token for remote Turso | Phase 2, remote only |
| `BETTER_AUTH_SECRET` | Better Auth session secret (`openssl rand -base64 32`) | Phase 2 |
| `BETTER_AUTH_URL` | Base URL Better Auth uses for redirects | Phase 2 |
| `LOG_LEVEL` | Pino level: `debug`/`info`/`warn`/`error` | Phase 5 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Optional OTLP exporter endpoint | Phase 5 |

## Commands

Every command also has a `make` alias (`make check`, `make test`, … — see `Makefile`).

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next dev server / production build / serve build |
| `pnpm check` / `pnpm lint` / `pnpm format` | Biome check / lint / format-write |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` / `test:unit` / `test:integration` | Vitest all / unit project / integration project |
| `pnpm test:e2e` | Playwright (desktop + mobile); starts dev server itself |
| `pnpm db:generate` / `db:migrate` / `db:seed` / `db:studio` | Drizzle kit + seed — no schema yet, arrives Phase 2 |

## Docs

- `docs/architecture.md` — structure and layering
- `docs/development.md` — local workflow
- `docs/testing.md` — test setup
- `docs/database.md`, `docs/authentication.md`, `docs/api.md` — land Phase 2+
- `docs/observability.md`, `docs/security.md`, `docs/deployment.md`
- `docs/decisions/` — ADRs
- `DESIGN.md` — visual system and UX rules
