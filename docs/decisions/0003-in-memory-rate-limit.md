# ADR 0003: In-memory rate limiting

- Status: Accepted (decision made 2026-10-17; implementation lands Phase 5)
- Source: `docs/superpowers/specs/2026-10-17-chat-app-design.md` Decisions log

## Decision

> Rate limit → **In-memory per instance** — Zero deps; documented ceiling.

## Context

Auth and message POST routes need rate limiting, but the spec discourages adding external infrastructure (non-goal: mandatory message-broker/external infra).

## Consequences

- In-memory sliding window on auth + message POST routes.
- **Known limitation:** the window is per-instance — on serverless, limits are not shared across instances and reset on cold start. This is a documented ceiling, not real enforcement.
- Upgrade path if real enforcement is needed: Redis/Upstash behind the same limiter call site.
