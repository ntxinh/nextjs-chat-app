# Specification Prompt: Full-Stack Chat Web Application

## 1. Project Overview

Act as a senior full-stack engineer and software architect. Design and implement a complete, maintainable chat web application for educational purposes using modern Next.js best practices.

The goal is to learn how to build a production-oriented full-stack application, including authentication, database modeling, API design, state management, observability, testing, CI/CD, and deployment.

Build a functional application, not just a UI prototype. All core features must work end to end, persist data, validate inputs, enforce authorization, and include automated tests.

### Primary objectives

- Build a modern, responsive messaging experience.
- Use Next.js App Router and React Server Components appropriately.
- Keep server state, client state, and URL state separate.
- Implement secure authentication and conversation-level authorization.
- Use Drizzle ORM with SQLite hosted on Turso.
- Design the persistence layer to support a future PostgreSQL migration.
- Expose documented APIs using OpenAPI and Scalar.
- Implement structured logging and OpenTelemetry instrumentation.
- Establish reliable automated testing and GitHub Actions CI.
- Deploy the application to Vercel.
- Provide comprehensive project documentation for developers and coding agents.

### Non-goals for the initial release

- Voice and video calls.
- End-to-end encryption.
- File and media uploads.
- Push notifications and mobile applications.
- Enterprise SSO.
- Microservices and Kubernetes.
- Mandatory external message-broker infrastructure.

Do not introduce unnecessary complexity or dependencies simply to demonstrate a technology.

---

## 2. Required Technology Stack

Use the following technologies and versions.

| Area | Technology |
|---|---|
| Framework | Next.js 16, App Router |
| Language | TypeScript, strict mode |
| UI | React version supported by Next.js 16 |
| Styling | Tailwind CSS |
| Components | shadcn/ui with Radix primitives |
| Client state | Zustand |
| Server state | TanStack Query |
| Validation | Zod |
| Internationalization | next-intl, English and Vietnamese |
| Theme | Light, Dark, System |
| Database | SQLite on Turso |
| ORM | Drizzle ORM |
| Authentication | Auth.js or another compatible, maintained authentication solution; document the selection |
| API specification | OpenAPI |
| API documentation UI | Scalar |
| Unit/integration tests | Vitest |
| End-to-end tests | Playwright |
| Linting and formatting | Biome |
| Logging | Pino |
| Observability | OpenTelemetry |
| Runtime/tool version management | mise, configured through `mise.toml` |
| CI/CD | GitHub Actions |
| Hosting | Vercel |
| Package manager | pnpm |
| Documentation | Markdown in `/docs`, plus `README.md`, `AGENTS.md`, and `DESIGN.md` |

Pin compatible tool versions in `mise.toml` and `package.json`. Use a committed pnpm lockfile. Verify compatibility before choosing versions; never invent package versions or silently substitute major versions.

---

## 3. Product Scope and Features

### 3.1 Authentication and accounts

Implement:

- Registration with email, display name, and password.
- Login and logout.
- Secure password hashing when using password-based authentication.
- Session management and expiration.
- Protected routes and server-side authorization.
- Profile management: display name and avatar URL.
- Account settings, including preferred language and theme.
- Basic account deletion with appropriate data cleanup.
- Friendly handling of invalid credentials, duplicate email addresses, and expired sessions.

Requirements:

- Never store plaintext passwords or expose password hashes.
- Never trust client-provided user IDs for authorization.
- Prevent unauthorized access to another user's conversations or messages.
- Use secure cookie settings in production.
- Validate all authentication inputs on the server.
- Avoid exposing sensitive authentication details in logs.

Use a maintained authentication library compatible with the selected Next.js, Drizzle, and SQLite versions. Document the chosen solution and its trade-offs.

Provide a development-only seed account workflow. Never ship a default production password or automatically create a public demo account with known credentials.

### 3.2 Conversations

Support two conversation types:

1. **Direct messages:** exactly two participants.
2. **Group conversations:** multiple participants.

Users must be able to:

- Start a direct conversation with another registered user.
- Create a group with a name and initial participants.
- View their conversation list.
- Search conversations by name or participant.
- Open a conversation and load its message history.
- View the latest message preview and timestamp.
- See unread message counts.
- Mark a conversation as read.
- Rename a group when authorized.
- Add participants when authorized.
- Leave a group.
- View the participants and their basic profile information.

For direct messages, prevent duplicate conversations for the same pair of users.

For groups, enforce participant membership and role-based permissions.

Define clear behavior when the current user leaves a conversation, a group becomes empty, or a participant is removed.

### 3.3 Messaging

Implement:

- Send text messages.
- Display sender identity and timestamp.
- Paginate older messages.
- Preserve message ordering.
- Edit a message authored by the current user.
- Soft-delete a message authored by the current user.
- Display edited and deleted states.
- Show unread separators where appropriate.
- Support Enter to send and Shift+Enter for a newline.
- Provide sending, success, and failure states.
- Retry failed sends without accidentally creating duplicate messages.
- Display empty, loading, and error states.

Message rules:

- Only conversation participants can read or send messages.
- Users can edit or delete only their own messages.
- Enforce a documented message length limit.
- Validate every message on the server.
- Store timestamps in UTC.
- Use deterministic ordering for messages with equal timestamps.
- Prevent duplicate writes with client-generated idempotency keys or an equivalent server-enforced mechanism.
- Escape or safely render user content; never render arbitrary user HTML.

### 3.4 Presence and delivery status

For the MVP, implement practical approximations:

- Online/offline or last-seen status, if supported by the chosen infrastructure.
- Message sending and failure indicators.
- Read receipts at the conversation level.
- Last-read message or last-read timestamp per participant.

Do not claim true real-time presence if it is implemented using periodic polling.

### 3.5 User discovery

Implement:

- Search registered users by display name.
- Display name and avatar in search results.
- Start a direct message from a search result.
- Paginate or limit search results.
- Exclude the current user from results when appropriate.

Do not expose email addresses in public user search results unless there is an explicit product requirement and appropriate authorization.

---

## 4. UI/UX Requirements

Build a polished, responsive messaging interface inspired by contemporary chat applications without copying proprietary branding.

### Desktop layout

Use a three-part layout where space permits:

1. **Navigation/sidebar**
   - Application branding.
   - Conversation search.
   - Recent conversations.
   - Unread badges.
   - New conversation action.
   - Current user profile and settings.

2. **Main conversation**
   - Conversation header.
   - Participant information.
   - Scrollable message history.
   - Message composer.
   - Sending and error indicators.

3. **Optional details panel**
   - Group participants.
   - Group settings.
   - Conversation metadata.

The details panel must be collapsible or omitted at narrower widths.

### Mobile layout

- Use a conversation-list screen and a separate conversation screen.
- Provide intuitive back navigation.
- Keep the message composer accessible above the on-screen keyboard.
- Avoid horizontal overflow.
- Ensure interactive controls have usable touch targets.
- Respect safe-area insets where applicable.

### Visual design

- Modern, clean interface.
- Consistent spacing, typography, borders, and radii.
- Appropriate contrast in all themes.
- Clear visual distinction between sent and received messages.
- Subtle hover, focus, and transition states.
- Skeleton loading for appropriate content.
- Useful empty states and actionable error messages.
- Accessible dialogs, dropdowns, forms, and keyboard navigation.

Use shadcn/ui components where suitable. Keep custom components focused on product-specific behavior rather than duplicating the component library.

### Accessibility

- Target WCAG 2.2 AA where practical.
- Support keyboard navigation.
- Provide visible focus indicators.
- Use semantic HTML and accessible labels.
- Announce important asynchronous state changes appropriately.
- Respect reduced-motion preferences.
- Do not rely solely on color to communicate status.

### Theme

Support:

- Light.
- Dark.
- System preference.

Persist the user's selection appropriately and avoid theme flashes during hydration.

### Internationalization

Use next-intl with:

- English (`en`).
- Vietnamese (`vi`).

Requirements:

- Use locale-aware routes, for example `/en/...` and `/vi/...`.
- Translate navigation, buttons, forms, validation messages, notifications, empty states, and accessibility labels.
- Keep translation messages in organized locale files.
- Format dates and times using locale-aware APIs.
- Avoid hardcoded user-facing strings in components.
- Define a default locale and document locale-switching behavior.
- Keep database language-independent; do not store translated UI labels in business tables.

---

## 5. Architecture and Code Organization

Use a modular monolith with clear boundaries. Do not introduce microservices.

Prefer the following structure, adjusting only when required by actual framework conventions.

```text
.
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── authentication.md
│   ├── database.md
│   ├── deployment.md
│   ├── development.md
│   ├── testing.md
│   ├── observability.md
│   ├── security.md
│   └── decisions/
├── messages/
│   ├── en.json
│   └── vi.json
├── public/
├── drizzle/
│   ├── migrations/
│   └── meta/
├── scripts/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   └── api/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── shared/
│   ├── features/
│   │   ├── auth/
│   │   ├── conversations/
│   │   ├── messages/
│   │   ├── users/
│   │   └── settings/
│   ├── i18n/
│   ├── lib/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── errors/
│   │   ├── logging/
│   │   ├── observability/
│   │   └── validation/
│   ├── server/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── policies/
│   ├── stores/
│   ├── hooks/
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .github/
│   └── workflows/
├── .editorconfig
├── .env.example
├── AGENTS.md
├── biome.json
├── DESIGN.md
├── drizzle.config.ts
├── mise.toml
├── Makefile
├── next.config.ts
├── openapi/
├── package.json
├── pnpm-lock.yaml
├── playwright.config.ts
├── README.md
├── tsconfig.json
└── vitest.config.ts
```

This is a suggested logical organization, not a requirement to create empty directories. Keep the final structure coherent and avoid unnecessary abstractions.

### Architectural rules

- Use React Server Components by default.
- Add Client Components only for interactive behavior requiring browser state or event handlers.
- Keep database access, secrets, and privileged business logic server-only.
- Never import server-only modules into client bundles.
- Use Server Actions for appropriate internal form mutations where beneficial.
- Use Route Handlers for the documented public application API.
- Do not duplicate the same business logic across Server Actions and Route Handlers.
- Centralize authorization and input validation.
- Keep database queries out of presentation components.
- Use repositories for meaningful persistence boundaries, not as boilerplate wrappers around every query.
- Use service functions for multi-step business operations.
- Use explicit error types and consistent API error responses.
- Avoid `any`, unsafe type assertions, and unnecessary global state.
- Avoid circular dependencies and oversized files.

### State management rules

Use each state tool for its intended purpose.

**Zustand**
- Client-only ephemeral UI state.
- Open or collapsed panels.
- Composer drafts when they must survive navigation.
- Local interaction state shared across components.

**TanStack Query**
- Client-managed server data when interactive client fetching is needed.
- Conversation list refresh.
- Message history and pagination.
- Mutation state and cache invalidation.
- Polling and retry policies where appropriate.

**Next.js**
- Initial server-rendered data.
- Authentication and authorization.
- Server-side mutations.
- Locale-aware routing.

Do not copy all server data into Zustand. Avoid maintaining the same authoritative data independently in multiple caches.

---

## 6. Database Design

Use Drizzle ORM with Turso-hosted SQLite for the initial implementation.

Create explicit schemas, foreign keys, indexes, uniqueness constraints, and migration files.

### Required entities

#### users

Suggested fields:

- `id`
- `email`
- `normalizedEmail`
- `displayName`
- `avatarUrl`
- `passwordHash`, if required by the chosen authentication strategy
- `createdAt`
- `updatedAt`
- `deletedAt`, if implementing soft deletion

Enforce case-insensitive or normalized email uniqueness consistently.

#### Authentication tables

Use the tables required by the selected authentication library, such as:

- Accounts.
- Sessions, if using database-backed sessions.
- Verification tokens, if required.

Follow the selected library's supported schema and security model rather than inventing incompatible authentication tables.

#### conversations

Suggested fields:

- `id`
- `type`: direct or group.
- `name`, nullable for direct conversations.
- `createdBy`
- `createdAt`
- `updatedAt`

#### conversation_members

Suggested fields:

- `conversationId`
- `userId`
- `role`
- `joinedAt`
- `lastReadAt`
- `lastReadMessageId`, nullable where appropriate
- `leftAt`, nullable if membership history is required

Use a composite primary key or equivalent uniqueness constraint for active membership semantics.

#### direct_conversation_pairs

Use a normalized participant-pair representation or equivalent uniqueness mechanism to prevent duplicate direct conversations.

Define deterministic ordering of participant IDs before storing the pair. Ensure the database constraint, rather than application logic alone, prevents duplicates.

#### messages

Suggested fields:

- `id`
- `conversationId`
- `senderId`
- `body`
- `createdAt`
- `updatedAt`
- `editedAt`
- `deletedAt`
- `clientMessageId`, if used for idempotency

Define indexes for conversation history and chronological pagination.

#### Optional supporting tables

Add only when needed:

- Group membership events.
- Message read receipts.
- User presence.
- User preferences.
- Idempotency records.

### Database requirements

- Define all IDs and timestamps consistently.
- Use UTC for stored timestamps.
- Use foreign keys with deliberate delete behavior.
- Enable and verify SQLite foreign-key enforcement.
- Add indexes for common list, lookup, and pagination queries.
- Use database transactions for operations that must be atomic.
- Avoid N+1 queries in conversation lists.
- Validate relational integrity at the database level wherever possible.
- Document SQLite-specific behavior and any future PostgreSQL differences.

### Message pagination

Use cursor-based pagination rather than offset pagination for message history.

Use a stable ordering key, such as `(createdAt, id)`, and fetch older messages relative to the cursor.

Do not rely on timestamps alone when ordering messages.

### Migration and seed data

Provide:

- Drizzle schema definitions.
- Generated, committed migration files.
- A documented migration command.
- A seed command for development.
- A deterministic development dataset with multiple users, direct conversations, groups, and messages.
- Idempotent seeding or clearly documented reset behavior.
- A safe database initialization workflow.

Never automatically run destructive migrations or seed production data during normal application startup.

---

## 7. Turso and Future PostgreSQL Support

### Initial database

Use Turso with the supported Drizzle SQLite driver and connection approach.

Requirements:

- Read connection settings from environment variables.
- Keep database credentials server-only.
- Support local development without requiring a production Turso database.
- Document local SQLite and Turso configuration.
- Account for SQLite's transaction, locking, and constraint behavior.
- Configure the driver appropriately for the selected Vercel runtime.

### PostgreSQL migration readiness

The initial database is SQLite. Do not attempt to support both databases simultaneously in the MVP.

However:

- Avoid unnecessary database-specific SQL.
- Keep schema definitions and query logic organized.
- Prefer Drizzle query APIs when they express the operation clearly.
- Isolate unavoidable dialect-specific queries.
- Avoid depending on SQLite-only behavior without documentation.
- Document changes required for PostgreSQL types, indexes, constraints, and transactions.
- Include a future migration guide in `docs/database.md`.

Do not claim that changing a connection string is sufficient to migrate SQLite to PostgreSQL. A real migration requires schema conversion, data transfer, validation, and testing.

---

## 8. API Design and OpenAPI/Scalar

Create a versioned REST API under `/api/v1`.

The API should be independently documented and testable, even when the frontend uses Server Components for initial rendering.

### Suggested endpoints

#### Authentication and users

- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `GET /api/v1/users?query=...`
- `GET /api/v1/users/{userId}`

Use the authentication library's appropriate endpoints for login, logout, and registration. Do not create competing authentication mechanisms.

#### Conversations

- `GET /api/v1/conversations`
- `POST /api/v1/conversations`
- `GET /api/v1/conversations/{conversationId}`
- `PATCH /api/v1/conversations/{conversationId}`
- `POST /api/v1/conversations/{conversationId}/members`
- `DELETE /api/v1/conversations/{conversationId}/members/me`
- `POST /api/v1/conversations/{conversationId}/read`

#### Messages

- `GET /api/v1/conversations/{conversationId}/messages`
- `POST /api/v1/conversations/{conversationId}/messages`
- `PATCH /api/v1/messages/{messageId}`
- `DELETE /api/v1/messages/{messageId}`

Adjust endpoint names if necessary to maintain REST consistency.

### API conventions

- Validate path parameters, query parameters, and request bodies with Zod.
- Reuse validation schemas where appropriate.
- Return consistent response shapes.
- Use appropriate HTTP status codes.
- Support cursor-based pagination.
- Include predictable error codes and human-readable messages.
- Do not expose stack traces or database internals.
- Enforce authorization on every protected resource.
- Define request and response schemas in OpenAPI.
- Include authentication requirements in the API specification.
- Provide examples for common success and error responses.

### OpenAPI and Scalar

- Generate or maintain an OpenAPI 3.1 specification from the actual API contracts.
- Keep API schemas synchronized with Zod validation.
- Avoid maintaining an independent, drifting specification.
- Expose the OpenAPI JSON at a documented endpoint.
- Provide Scalar API documentation at a documented route, preferably development-only or explicitly protected in production.
- Ensure the generated specification reflects the actual deployed API.
- Add a CI check to detect invalid or stale API documentation.

Do not expose secret values or internal operational details in API documentation.

---

## 9. Chat Refresh and Realtime Strategy

The MVP must work on Vercel without requiring a persistent Node.js server.

Implement an initial **polling-based messaging strategy**:

- Poll for new messages only while the conversation view is active.
- Use a reasonable configurable interval.
- Avoid unnecessary requests when the tab is hidden.
- Pause or reduce polling when the browser is offline.
- Deduplicate messages returned by overlapping requests.
- Update TanStack Query caches after successful mutations.
- Use bounded retry with backoff.
- Stop polling when the relevant view is unmounted.

Optimistically render outgoing messages only when rollback and duplicate prevention are implemented correctly.

Use TanStack Query for polling and cache coordination.

Define an interface or clear service boundary that allows future migration to a realtime provider or managed WebSocket service.

Document the limitations of polling, including latency and request volume.

Do not implement custom WebSocket infrastructure unless the selected hosting architecture explicitly supports it.

---

## 10. Security Requirements

Treat security as a core acceptance criterion.

Implement:

- Server-side authorization for every protected operation.
- Conversation membership checks before reading or mutating messages.
- Group role and membership validation.
- Secure authentication and session handling.
- Zod validation for untrusted input.
- Password hashing through a maintained, appropriate library if passwords are used.
- Rate limiting for authentication, user search, and message creation where practical.
- Consistent request size and message length limits.
- Safe rendering of user-generated content.
- Secure cookie configuration.
- Protection against account enumeration where appropriate.
- Safe handling of environment variables.
- Redaction of passwords, tokens, cookies, and authorization headers from logs.
- Appropriate CSRF protections for cookie-authenticated mutations.
- Production-safe error messages.
- Explicit CORS policy if cross-origin access is required.
- Safe redirect validation for authentication flows.

Use an appropriate security-header policy, including Content Security Policy where compatible with the application.

Never place secrets in client components, public environment variables, source control, logs, or generated OpenAPI examples.

Document the threat model and key security decisions in `docs/security.md`.

---

## 11. Observability: Pino and OpenTelemetry

### Pino logging

Implement structured JSON logs in production and readable logs in development.

Log relevant events such as:

- Request start and completion.
- Request duration and status.
- Authentication success or failure, without sensitive payloads.
- Message creation failures.
- Database operation failures.
- Unexpected application errors.
- Background or scheduled operations if introduced later.

Requirements:

- Use appropriate log levels.
- Add request or trace correlation IDs.
- Redact secrets and personal data that should not be logged.
- Avoid logging complete message bodies by default.
- Prevent duplicate request logs.
- Keep logging utilities server-only.
- Provide a clean mechanism to disable or adjust logging in tests.

### OpenTelemetry

Instrument supported application paths with OpenTelemetry.

Include:

- HTTP request traces.
- Database operation spans where supported.
- Request duration and failure attributes.
- Trace context propagation where applicable.
- Error recording.
- Configurable exporter setup.

Account for the Next.js runtime, Node.js instrumentation requirements, and Vercel deployment constraints.

Do not initialize Node.js-only instrumentation in Edge Runtime code.

Use environment-based configuration for exporters. Do not require a paid observability platform for local development.

Provide a local testing option or documented instructions for inspecting traces.

Avoid high-cardinality or sensitive attributes, especially user identifiers, message contents, and authentication data.

Document what works locally and what requires external infrastructure in `docs/observability.md`.

---

## 12. Testing Strategy

### Vitest: unit tests

Test:

- Zod validation schemas.
- Permission policies.
- Conversation-pair normalization.
- Message validation and idempotency logic.
- Cursor encoding and decoding.
- Date and locale-related utilities.
- Error mapping.
- Pure service logic.

Use deterministic test data and mock only external boundaries when appropriate.

### Vitest: integration tests

Test database-backed operations:

- User and conversation persistence.
- Direct conversation uniqueness.
- Group membership and permissions.
- Message creation and ordering.
- Cursor pagination.
- Edit and delete behavior.
- Read-state updates.
- Unauthorized access.
- Transaction rollback where applicable.

Use an isolated test database and reliable setup/teardown.

Prefer real SQLite integration tests over extensive database mocking.

### Playwright: end-to-end tests

Cover at least these flows:

1. Register a new account.
2. Log in and log out.
3. Open the conversation list.
4. Search for another user.
5. Start a direct conversation.
6. Send and receive messages using two independent test accounts.
7. Reload the page and verify message persistence.
8. Load older messages through pagination.
9. Edit and delete an owned message.
10. Verify that another user cannot access a private conversation.
11. Create a group and manage participants.
12. Verify unread and read states.
13. Change the language between English and Vietnamese.
14. Change theme between Light, Dark, and System.
15. Test responsive behavior on mobile and desktop.

Do not use production data or credentials in tests.

Tests should be deterministic. Do not rely on arbitrary sleeps when observable UI conditions can be awaited.

Document which tests require a local database and which require an external service.

---

## 13. Code Quality and Developer Experience

### TypeScript

- Enable strict TypeScript checking.
- Avoid `any`.
- Use type-safe database schemas.
- Infer types from Drizzle and Zod when appropriate.
- Avoid redundant types that duplicate existing contracts.
- Validate untrusted data at runtime.

### Biome

Configure Biome for formatting and linting.

Use consistent import ordering and formatting rules where supported.

Avoid introducing ESLint and Prettier unless a specific required integration cannot be covered by Biome. If an exception is necessary, document it.

### mise.toml

Use mise to pin the required runtime and development tool versions.

Document installation and setup instructions. Avoid installing duplicate versions through competing version managers.

### .editorconfig

Configure consistent:

- UTF-8 encoding.
- LF line endings.
- Indentation.
- Final newline.
- Trailing whitespace handling.

### Makefile

Provide useful developer commands, such as:

```makefile
.PHONY: install dev build start check lint format typecheck test test-unit test-integration test-e2e db-generate db-migrate db-seed db-studio

install:
	pnpm install --frozen-lockfile

dev:
	pnpm dev

build:
	pnpm build

start:
	pnpm start

check:
	pnpm check

lint:
	pnpm lint

format:
	pnpm format

typecheck:
	pnpm typecheck

test:
	pnpm test

test-unit:
	pnpm test:unit

test-integration:
	pnpm test:integration

test-e2e:
	pnpm test:e2e

db-generate:
	pnpm db:generate

db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed

db-studio:
	pnpm db:studio
```

Adapt the commands to actual package scripts. Do not leave targets pointing to nonexistent scripts.

### Environment variables

Provide `.env.example` with documented placeholders for all required configuration.

Include only variables that the implementation actually uses, such as:

- Application URL.
- Authentication secret and provider settings.
- Turso database URL.
- Turso authentication token.
- Logging level.
- OpenTelemetry exporter configuration.
- Optional development-only test settings.

Validate required server-side environment variables at startup or at a well-defined configuration boundary.

Never commit `.env` files containing secrets.

---

## 14. AGENTS.md, README.md, DESIGN.md, and Documentation

### AGENTS.md

Write concise instructions for coding agents working in this repository.

Include:

- Technology stack and architecture.
- Directory conventions.
- Important commands.
- Testing requirements.
- Database migration rules.
- Security constraints.
- Internationalization requirements.
- Code quality rules.
- Instructions to update documentation when architecture or behavior changes.

Do not copy the entire README into AGENTS.md.

### README.md

Include:

- Project overview.
- Feature list.
- Screenshots section or instructions for adding screenshots.
- Technology stack.
- Prerequisites.
- Installation and local setup.
- Environment configuration.
- Database setup and migrations.
- Seed instructions.
- Test commands.
- Development workflow.
- Vercel deployment instructions.
- Links to detailed documentation.

### DESIGN.md

Define the visual system and UX principles.

Include:

- Product design goals.
- Color tokens for light and dark themes.
- Typography.
- Spacing and layout.
- Component conventions.
- Responsive breakpoints.
- Interaction states.
- Accessibility rules.
- Message layout and scrolling behavior.
- Loading, empty, error, and success states.

### /docs directory

Maintain practical documentation for:

- Architecture and data flow.
- Authentication and authorization.
- API contracts.
- Database schema and migrations.
- PostgreSQL migration strategy.
- Local development.
- Testing.
- Deployment.
- Security.
- Observability.
- Architectural decisions.

Documentation must reflect the implemented system, not merely the original plan.

When behavior or architecture changes, update the relevant documentation in the same change.

---

## 15. GitHub Actions CI/CD

Implement GitHub Actions workflows for pull requests and the main branch.

### CI workflow

Run:

1. Checkout source.
2. Set up mise and required runtimes.
3. Install dependencies using the committed lockfile.
4. Check formatting and lint rules.
5. Run TypeScript type checking.
6. Run unit tests.
7. Run integration tests.
8. Validate Drizzle migrations and schema consistency.
9. Validate OpenAPI output.
10. Build the Next.js application.
11. Run Playwright E2E tests where the CI environment supports them.

Use caching appropriately without compromising dependency reproducibility.

Ensure the pipeline fails on test failures, lint violations, type errors, or build errors.

Do not expose production secrets to untrusted pull requests.

### Deployment workflow

Use Vercel's Git integration or a documented GitHub Actions deployment workflow.

Choose one primary deployment mechanism to avoid duplicate deployments.

Requirements:

- Preview deployments for pull requests when configured.
- Production deployments from the designated branch.
- Required environment variables configured outside source control.
- Database migrations performed through a controlled, documented release step.
- No destructive migration execution as part of normal application startup.
- A rollback strategy appropriate to Vercel and the selected database.

Account for Vercel build-time and runtime differences, especially when using Turso and OpenTelemetry.

---

## 16. Vercel Deployment

The application must deploy to Vercel with Turso as the production database.

Verify:

- The selected database driver works in the deployed runtime.
- No long-running process is required.
- Polling works across separate serverless invocations.
- Database connections and request handling are appropriate for serverless execution.
- Environment variables are configured correctly.
- The application uses a stable production URL.
- Authentication callbacks and cookie settings work behind the hosting platform's proxy.
- Static assets and locale routes behave correctly.
- Error responses do not expose internal details.

Provide step-by-step instructions in `docs/deployment.md`.

Document any limitations caused by the free tiers or external service plans. Do not assume a service's free tier, quota, or availability is permanent.

---

## 17. Implementation Phases

Implement the project in small, verifiable phases. Do not attempt to generate the entire application in one uncontrolled change.

### Phase 1: Foundation

- Initialize Next.js and TypeScript.
- Configure pnpm, mise, Biome, Tailwind CSS, and shadcn/ui.
- Set up next-intl.
- Implement theme switching.
- Add the initial layout and responsive navigation.
- Add `AGENTS.md`, `README.md`, `DESIGN.md`, and `/docs`.
- Configure Vitest and Playwright.
- Add GitHub Actions CI.
- Verify that the application builds.

**Exit criteria:** the application starts locally, builds successfully, and passes formatting, linting, and type checking.

### Phase 2: Database and authentication

- Configure Drizzle and SQLite.
- Add Turso configuration.
- Define authentication schemas.
- Generate and apply migrations.
- Implement authentication and session handling.
- Add development seed data.
- Protect application routes.
- Test authorization boundaries.

**Exit criteria:** users can register, authenticate, persist sessions according to the chosen strategy, and access only authorized resources.

### Phase 3: Conversations

- Implement conversation and membership schemas.
- Build user search.
- Implement direct conversation creation with uniqueness protection.
- Implement group creation and participant management.
- Build the conversation sidebar.
- Add cursor-paginated conversation lists.
- Test membership and authorization rules.

**Exit criteria:** users can discover other users, start direct conversations, create groups, and manage membership according to defined permissions.

### Phase 4: Messaging

- Implement message creation, retrieval, editing, and deletion.
- Add idempotency protection.
- Implement cursor-based message pagination.
- Add unread and read states.
- Implement polling with TanStack Query.
- Add optimistic UI only where safe.
- Build the complete responsive message composer and message list.
- Add database integration tests.

**Exit criteria:** the complete messaging flow works across independent accounts and persists correctly after reload.

### Phase 5: API and observability

- Finalize versioned Route Handlers.
- Standardize errors and validation.
- Generate and publish OpenAPI.
- Integrate Scalar.
- Add Pino logging.
- Add OpenTelemetry instrumentation.
- Verify secret redaction.
- Document local observability and production limitations.

**Exit criteria:** documented API endpoints work independently of the UI, and logs and traces can be inspected in supported environments.

### Phase 6: Testing and hardening

- Complete unit and integration coverage for critical logic.
- Implement Playwright end-to-end scenarios.
- Test mobile responsiveness.
- Test English and Vietnamese.
- Test theme persistence.
- Audit authentication and authorization.
- Verify duplicate-message prevention and pagination boundaries.
- Fix all critical and high-priority defects.

**Exit criteria:** the required automated test suite passes, and the application has no known critical authorization or data-integrity defects.

### Phase 7: Deployment

- Configure Turso production database.
- Apply migrations through the release workflow.
- Configure Vercel environment variables.
- Deploy a preview environment.
- Verify authentication, messaging, database access, and observability.
- Configure production deployment.
- Document rollback and recovery procedures.

**Exit criteria:** the deployed application supports the complete core user journey without relying on local development services.

---

## 18. Definition of Done

The project is complete only when all applicable criteria are satisfied.

### Functional

- [ ] Registration, login, logout, and session handling work.
- [ ] Users can search for other users.
- [ ] Direct and group conversations work.
- [ ] Users can send, edit, and delete authorized messages.
- [ ] Message history persists across reloads.
- [ ] Pagination and deterministic ordering work.
- [ ] Duplicate direct conversations and duplicate message submissions are controlled.
- [ ] Membership and read permissions are enforced server-side.
- [ ] Read states and unread counts work.
- [ ] Polling updates active conversations without excessive requests.

### UI/UX

- [ ] Responsive desktop and mobile layouts work.
- [ ] Light, Dark, and System themes work.
- [ ] English and Vietnamese translations are complete.
- [ ] Loading, empty, error, and success states are implemented.
- [ ] Keyboard navigation and accessible controls are supported.

### Architecture and data

- [ ] The application follows the documented modular monolith architecture.
- [ ] Database schemas and migration files are committed.
- [ ] Development seed data is available.
- [ ] Turso configuration works in the deployed runtime.
- [ ] PostgreSQL migration considerations are documented.
- [ ] Server-only code and secrets are not exposed to client bundles.

### Quality and operations

- [ ] Biome checks pass.
- [ ] TypeScript checks pass.
- [ ] Unit and integration tests pass.
- [ ] Critical Playwright scenarios pass.
- [ ] OpenAPI and Scalar are available as documented.
- [ ] Pino logs are structured and sensitive values are redacted.
- [ ] OpenTelemetry instrumentation works in supported environments.
- [ ] GitHub Actions CI passes.
- [ ] Vercel deployment succeeds.
- [ ] Documentation reflects the implementation.

Do not mark an item complete unless it has been implemented and verified.

---

## 19. Coding Agent Execution Rules

Follow these rules throughout implementation.

1. Inspect the existing repository before making changes. If it is empty, initialize it cleanly.
2. Create a short implementation plan based on the phases above.
3. Verify current framework and library documentation when compatibility or API behavior is uncertain.
4. Prefer official documentation and maintained packages.
5. Make small, coherent changes rather than generating the entire project in one step.
6. Run relevant checks after each meaningful phase.
7. Fix errors before moving on to dependent work.
8. Never leave placeholder implementations for core requirements.
9. Do not claim a feature works unless its implementation and verification support that claim.
10. Do not introduce unnecessary dependencies, abstractions, or infrastructure.
11. Never hardcode credentials or commit generated secrets.
12. Keep database migrations, tests, and documentation synchronized with schema changes.
13. Ensure all important operations have appropriate error handling.
14. Keep UI components small, typed, accessible, and reusable where justified.
15. Do not suppress TypeScript errors or weaken test assertions merely to make CI pass.
16. If a requirement conflicts with the selected framework, runtime, or hosting platform, document the constraint and implement the simplest viable alternative.
17. Maintain a concise implementation checklist in the project documentation and update it as phases are completed.

### Final delivery report

At the end, provide:

- A summary of implemented features.
- The final project structure.
- Key architectural decisions and trade-offs.
- Setup and execution commands.
- Environment variables required.
- Database migration and seed instructions.
- Test commands and actual results.
- GitHub Actions and Vercel deployment instructions.
- Any incomplete features or known limitations.
- A prioritized list of recommended next steps.

Begin with repository inspection and a short implementation plan. Then implement Phase 1, verify it, and continue through the remaining phases without skipping required checks.
