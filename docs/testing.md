# Testing

## Layout

- `tests/unit/` — Vitest `unit` project (`*.test.ts`, node env). `@/` path alias resolved via `vite-tsconfig-paths`.
- `tests/integration/` — Vitest `integration` project with `global-setup.ts` (currently a stub; real file-backed SQLite setup lands with the db in Phase 2). `passWithNoTests` is on.
- `tests/e2e/` — Playwright, `desktop` (Desktop Chrome) + `mobile` (Pixel 7) projects. `webServer` runs `pnpm dev` on `localhost:3000`, waits for `/en`, reuses an existing server outside CI. Traces on failure.

## Commands

```sh
pnpm test              # all vitest projects
pnpm test:unit
pnpm test:integration
pnpm test:e2e          # playwright install --with-deps chromium first time
```

## Current coverage

- `tests/unit/example.test.ts` — wiring check (`@/` alias, i18n routing).
- `tests/e2e/smoke.spec.ts` — localized app shell renders on desktop and mobile.
- Integration suite is empty until the schema lands.

## Conventions

- TDD: failing test before implementation.
- Deterministic data; await observable UI — no sleeps.
- Planned (design §8): unit for Zod schemas, policies, DM-pair normalization, cursor codec, idempotency, error mapping; integration for DM uniqueness, ordering, pagination edges, authz failures, rollback; e2e for spec §12 flows 1–15.

_Last verified: 2026-10-17, Phase 1._
