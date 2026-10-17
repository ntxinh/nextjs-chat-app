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
