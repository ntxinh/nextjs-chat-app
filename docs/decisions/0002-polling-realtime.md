# ADR 0002: Polling realtime

- Status: Accepted (decision made 2026-10-17; implementation lands Phase 4)
- Source: `docs/superpowers/specs/2026-10-17-chat-app-design.md` Decisions log

## Decision

> Realtime → **Polling only** — Vercel serverless; no WS infra needed.

## Context

The spec asks for timely message refresh without mandating true realtime infrastructure; Vercel serverless has no persistent WebSocket server.

## Consequences

- TanStack Query `refetchInterval`: 5s on the open conversation, 15s on the conversation list; disabled when `document.hidden` or offline; bounded retry with backoff.
- Send dedup via `clientMessageId`; optimistic send with temp id + rollback.
- Presence is approximated as throttled `lastSeenAt` shown as "last seen" — never claimed as live presence.
- Future realtime seam = invalidation boundary in query hooks; no bespoke provider abstraction until a provider exists.
