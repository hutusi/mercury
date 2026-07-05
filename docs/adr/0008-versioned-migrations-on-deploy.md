# ADR 0008: Versioned Drizzle migrations, applied automatically on deploy

**Status:** Accepted (2026-07)

Supersedes the schema-application mechanism described in [ADR 0002](0002-sqlite-plus-drizzle.md)
("Schema changes apply via `drizzle-kit push`") and referenced in [ADR 0007](0007-postgres-neon-for-serverless.md)'s
Decision section ("Schema still applies via `drizzle-kit push`").

## Context

`drizzle-kit push` diffs the TypeScript schema against whatever the target database currently
looks like and applies the result directly — no history, no reviewable artifact, and nothing runs
it automatically. That's exactly how production ended up serving from an empty schema: the Neon
database was fully provisioned (via the Vercel Marketplace integration) but `db:push` was never
run against it, and nothing in CI/CD would have caught that. Fixing the immediate incident meant
running `db:push` by hand once; fixing the actual gap means schema changes should ship the way
code does — reviewed, versioned, and applied automatically on deploy.

## Decision

Adopt **`drizzle-kit generate` + `drizzle-orm`'s `migrate()`**, applied automatically during the
Vercel build via a `vercel-build` script (`bun run db:migrate && bun run build`), before
`next build` runs.

- **Why `generate`+`migrate` over `push`:** `generate` snapshots a schema change as a committed
  SQL file under `drizzle/`, reviewable in a PR like any other code; `migrate()` replays whatever
  hasn't run yet, tracked in a small bookkeeping table (`drizzle.__drizzle_migrations`), so every
  environment converges on the same, deterministic history instead of a live diff computed fresh
  each time.
- **Why automatic-on-deploy over a manual step:** a manual step is exactly what got skipped this
  time. Wiring it into `vercel-build` means production and every preview deployment (each on its
  own Neon branch) migrate themselves, and — since the runner exits non-zero on any failure — a
  bad migration fails the build loudly instead of shipping app code against a schema it doesn't
  match.
- **Why `vercel-build` over a `vercel.json` buildCommand:** zero-config, Vercel/Next.js's own
  convention for overriding the default build command; no new config file for something this
  project doesn't otherwise need `vercel.json` for.
- **Why the runner (`src/lib/db/migrate.ts`) opens its own connection:** the app's cached `db`
  singleton (`src/lib/db/index.ts`) is meant to live for a server process's lifetime and never
  closes its pool — wrong shape for a one-shot build step. The runner also takes a Postgres
  advisory lock over the **unpooled** connection (`DATABASE_URL_UNPOOLED`, which Neon's
  integration already injects) so two overlapping deploys targeting the same branch serialize
  instead of racing on the bookkeeping table; PgBouncer's transaction-mode pooling can hand a
  session-scoped lock to a different backend mid-run, so the direct connection is required for
  this specifically, not the app's normal pooled one.
- **Why `db:push` is kept:** Drizzle's own recommended hybrid — fast, disposable iteration on a
  local schema change before committing to a migration file. Scoped to local use only; CI, e2e,
  and Neon never see it again.

Bringing an already-`push`-provisioned database (production, and local dev's persistent
docker-compose volume) under migration control needed a one-time baseline rather than just
running `migrate()` cold: `migrate()` would try to re-run the baseline migration's `CREATE TABLE`
statements against tables that already exist. Since the migrator only checks the single
most-recent bookkeeping row's timestamp, `scripts/db-baseline.ts` inserts one correct row (hash of
the baseline migration's exact file content, its journal timestamp) without ever executing that
file's SQL there — production was baselined once, by hand, immediately before this change merged;
local dev is simpler to just wipe (`docker compose down -v`) and re-migrate from empty, since its
data is disposable by design (ADR 0002/0007).

## Consequences

- Migrations are immutable once merged — a mistake is fixed with a new migration, never an edited
  one (the migrator hashes file content).
- `db:seed` stays a manual step, not folded into `vercel-build`: schema correctness is
  build-blocking, content freshness isn't, and automating seed would couple every deploy —
  including unrelated hotfixes — to seed/content validation.
- CI's `quality` job now replays every committed migration against an empty database on each run,
  which doubles as a check that nobody edited `schema.ts` without also running `db:generate`.
- A failed `db:migrate` blocks the entire deploy — there is no "ship the app, fix the database
  later" fallback.
- New Neon preview branches created after production's baseline inherit its bookkeeping row
  automatically (branches are copy-on-write from the parent at creation time) and need no special
  handling; any branch from a PR already open at baseline time needs the same one-off treatment,
  or a fresh branch (close/reopen the PR).
