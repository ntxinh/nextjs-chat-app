# Architecture

Modular monolith: one Next.js 16 App Router app, no microservices.
Design source: `docs/superpowers/specs/2026-10-17-chat-app-design.md`; structure per `docs/specs.md` §5.

## Built now

├── app/[locale]/
│   ├── layout.tsx               # root html/body: locale validation, intl + theme providers
│   └── (app)/                   # app shell routes
│       ├── layout.tsx           # shell: sidebar / main / details panel
│       ├── page.tsx             # conversation-list-first home
│       └── conversations/[id]/  # conversation route (stub page)
├── components/
│   ├── ui/                      # shadcn/ui (radix-nova) primitives
│   ├── layout/                  # app-shell, sidebar, details-panel
│   └── theme-provider.tsx, theme-toggle.tsx
├── i18n/{routing,navigation,request}.ts   # next-intl wiring (en, vi)
├── lib/utils.ts                 # cn()
└── proxy.ts                     # next-intl middleware
messages/{en,vi}.json            # all user-facing strings
tests/{unit,integration,e2e}/
```

- RSC by default; Client Components only where interactive (theme toggle, panels).
- Desktop: three-pane shell; details panel collapses at narrower widths. Mobile: single pane — list screen at `/`, conversation screen under `/conversations/[id]`, with back nav.
- Locales `en` (default) + `vi`; `[locale]` segment; internal nav via `src/i18n/navigation.ts`, never `next/link` directly.
- Theme: next-themes `attribute="class"`, system-aware; tokens in `DESIGN.md` / `src/app/globals.css`.

## Target layering (lands Phases 2–5)

```text
Route handler (/api/v1)  ─┐
                          ├─ Zod validate → policies/ authorize → services/
Server Action            ─┘                    ↓
                                     repositories/ → Drizzle
                          → { data } or { error: { code, message } }
```

- Both entry paths call the same services — no duplicated business logic.
- `src/server/policies/` is the only place authorization lives.
- Cursor pagination: opaque base64 of `(createdAt, id)`.
- Future dirs (created only when needed): `src/features/`, `src/server/{repositories,services,policies}/`, `src/lib/{auth,db,errors,logging,observability,validation}/`, `src/stores/`, `src/hooks/`, `src/types/`, `src/app/api/`, `drizzle/`, `scripts/`, `openapi/`.

_Last verified: 2026-10-17, Phase 1._
