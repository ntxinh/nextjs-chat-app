# Deployment

**Status: not deployed — lands Phase 7.** No production environment exists yet.

## Chosen approach (design doc §9)

- Host: Vercel via Git integration — preview per PR, production on `main`. Single deploy mechanism; no duplicate GitHub Actions deploy.
- CI (`.github/workflows/ci.yml`) already runs on push/PR: mise → `pnpm install --frozen-lockfile` → `pnpm check` → `pnpm typecheck` → `pnpm test:unit` → `pnpm test:integration` → drizzle schema check (skipped until `drizzle.config.ts` exists) → `pnpm build` → Playwright.
- Later phases add to the pipeline: OpenAPI freshness diff, `drizzle-kit check`.
- `drizzle-kit migrate` is a documented manual release step — never run at app boot.

## Environment (when deployed)

Production needs `DATABASE_URL` + `DATABASE_AUTH_TOKEN` (Turso), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`; optional `LOG_LEVEL`, `OTEL_EXPORTER_OTLP_ENDPOINT`. See `.env.example`.

_Last verified: 2026-10-17, Phase 1._
