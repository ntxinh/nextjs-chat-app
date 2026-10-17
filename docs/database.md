# Database

**Status: not implemented — lands Phase 2 (Task 10+).** No `drizzle.config.ts`, schema, or migrations exist yet; `pnpm db:*` scripts are placeholders.

## Chosen approach (design doc §3)

- Drizzle ORM + Turso/libSQL. IDs: `text` uuid v7. Timestamps: integer UTC ms. `PRAGMA foreign_keys = ON` verified on connect.
- Schema designed to allow a future PostgreSQL migration (spec §7).

Tables:

| Table | Key fields / constraints |
|---|---|
| `user` | Better Auth base + `displayName`, `avatarUrl`, `normalizedEmail` (unique), `deletedAt`, `lastSeenAt` |
| `account`, `session`, `verification` | Better Auth generated |
| `conversations` | `type` (`direct`\|`group`), `name` (null for DM), `createdBy`, `createdAt`, `updatedAt` |
| `conversation_members` | PK `(conversationId, userId)`, `role` (`owner`\|`member`), `joinedAt`, `lastReadMessageId`, `leftAt` |
| `direct_conversation_pairs` | `userA < userB` normalized, unique `(userA, userB)` → `conversationId` — DB-level DM dedup |
| `messages` | `conversationId`, `senderId`, `body` (≤4000 chars), `createdAt`, `editedAt`, `deletedAt`, `clientMessageId`; unique `(senderId, clientMessageId)`; index `(conversationId, createdAt, id)` |

- Unread = messages after the member's `lastReadMessageId`; no separate receipts table.
- Soft delete: `messages.deletedAt` (body retained, rendered deleted); `conversation_members.leftAt` (loses access, history kept). Owner leaving transfers to the longest-joined member; last member leaving deletes the group.
- Pagination cursor: opaque base64 of `(createdAt, id)`.
- `drizzle-kit migrate` is a documented manual release step — never at app boot. Seed via `make db-seed` (dev only).

## Environment

`DATABASE_URL` (default `file:./dev.db`), `DATABASE_AUTH_TOKEN` (remote Turso only) — see `.env.example`.

_Last verified: 2026-10-17, Phase 1 — no database code exists yet._
