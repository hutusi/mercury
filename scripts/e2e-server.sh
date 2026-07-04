#!/usr/bin/env bash
# Boot the E2E server against a fresh scratch database.
# Invoked by Playwright's webServer with DATABASE_URL/PORT/auth env set.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"

# Reset to a pristine schema, then apply the schema and seed content.
bunx tsx scripts/db-reset.ts
bun run db:push
bun run db:seed

exec bunx next start -p "${PORT:-3100}"
