# Development

## Prerequisites

- [mise](https://mise.jdx.dev/) — `mise install` gives Node 24 + pnpm 10 (`mise.toml`).

## Daily workflow

```sh
pnpm install        # after pulling
pnpm dev            # http://localhost:3000 → /en
pnpm check          # Biome lint+format check — must pass before commit
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest unit + integration
pnpm test:e2e       # playwright (starts its own dev server)
```

Every `pnpm` command has a `make` alias (`make dev`, `make check`, … — see `Makefile`).

## Conventions

- Formatting/linting: Biome (`biome.json`); no Prettier/ESLint. `pnpm format` to fix.
- TS strict; no `any`, no unsafe assertions.
- All user-facing strings in `messages/{en,vi}.json`; internal links via `src/i18n/navigation.ts`.
- UI: shadcn/ui primitives in `src/components/ui/`; add more with `pnpm dlx shadcn add <name>` (style: radix-nova, per `components.json`).
- Design tokens live in `src/app/globals.css` + `DESIGN.md`; use tokens (incl. `ring`), not raw colors.
- Commits: conventional (`feat:`, `fix:`, `docs:`, …).
- Docs: update the matching `docs/*.md` in the same change as a behavior/architecture change.

## Env

`cp .env.example .env` — nothing consumes env vars yet; see README env table for when each lands.

_Last verified: 2026-10-17, Phase 1._
