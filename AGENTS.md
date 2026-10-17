<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Chat App

## Stack

- Next.js 16 (App Router) + React 19, TypeScript strict.
- Tailwind 4 + shadcn/ui (radix-nova style) + next-themes; tokens defined in `DESIGN.md`.
- next-intl: locales `en` (default) + `vi`, `[locale]` segment, middleware in `src/proxy.ts`.
- Biome (lint + format), Vitest, Playwright, pnpm, mise.
- Planned, not yet installed/built: Drizzle + Turso, Better Auth, TanStack Query, Zustand, Pino + OTel. See `docs/` and `docs/superpowers/specs/2026-10-17-chat-app-design.md`.

## Layout

Built now:

- `src/app/[locale]/(app)/` — app shell: sidebar / main / collapsible details on desktop, single-pane with back nav on mobile.
- `src/components/{ui,layout}/`, `src/components/theme-*.tsx` — shadcn primitives + shell.
- `src/i18n/{routing,navigation,request}.ts`, `messages/{en,vi}.json`.
- `src/lib/utils.ts` (`cn`), `tests/{unit,integration,e2e}/`.

Target structure (spec §5) adds `src/features/`, `src/server/{repositories,services,policies}/`, `src/lib/{auth,db,errors,logging,observability,validation}/`, `src/stores/`, `src/hooks/`, `src/types/`, `src/app/api/`, `drizzle/`, `scripts/`. Create directories only as tasks need them — never preemptively.

## Commands

Makefile targets wrap pnpm: `make install dev build start check lint format typecheck test test-unit test-integration test-e2e db-generate db-migrate db-seed db-studio`.

- `make check` = `biome check .` (required before commit), `make typecheck` = `tsc --noEmit`.
- `make test-e2e` boots `pnpm dev` itself via Playwright webServer.
- `db-*` targets exist but have no schema until Phase 2.

## Rules

- RSC by default; Client Components only where interactive (state, handlers).
- Server-only modules (db access, secrets, privileged logic) must never be imported into client bundles.
- All user-facing strings live in `messages/{en,vi}.json` — no hardcoded strings, no `next/link` for internal nav (use `src/i18n/navigation.ts`).
- Timestamps: integer UTC ms. IDs: uuid v7 text. (Applies once the db lands.)
- Pagination: opaque cursor = base64 of `(createdAt, id)`; never timestamp-only ordering.
- Authorization lives in `src/server/policies/` only; the session is the identity — never trust client-supplied user IDs.
- Both Route Handlers and Server Actions call the same services — no duplicated business logic.
- TDD: failing test before implementation.
- Update docs in the same change when behavior or architecture changes.
- Conventional commits.
