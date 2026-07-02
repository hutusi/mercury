#!/usr/bin/env bash
# Boot the E2E server against a fresh scratch database.
# Invoked by Playwright's webServer with MERCURY_DB_PATH/PORT/auth env set.
set -euo pipefail

: "${MERCURY_DB_PATH:?MERCURY_DB_PATH must be set}"

mkdir -p "$(dirname "$MERCURY_DB_PATH")"
rm -f "$MERCURY_DB_PATH" "$MERCURY_DB_PATH"-wal "$MERCURY_DB_PATH"-shm

bun run db:push
bun run db:seed

exec bunx next start -p "${PORT:-3100}"
