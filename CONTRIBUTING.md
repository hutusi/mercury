# Contributing

## Prerequisites

- **Bun 1.3+** — package manager, script runner, and unit-test runner.
- **Node.js ≥ 20.9** (development uses 24/26) — the runtime for Next.js, the seed script, and Playwright, matching Vercel's Node build ([ADR 0001](docs/adr/0001-bun-package-manager-node-runtime.md)).
- **Postgres 17+** — a local database for dev and E2E. The quickest path is `docker compose up -d` (see `docker-compose.yml`); a system/Homebrew Postgres or a Neon dev branch works too ([ADR 0007](docs/adr/0007-postgres-neon-for-serverless.md)).

## Setup

```bash
bun install
docker compose up -d   # start local Postgres (or use your own)
cp .env.example .env
# set DATABASE_URL, e.g.:  postgresql://mercury:mercury@localhost:5432/mercury
# set BETTER_AUTH_SECRET, e.g.:  openssl rand -base64 32
# optional: ANTHROPIC_API_KEY enables AI grading (the app degrades gracefully without it)

bun run db:push   # apply the Drizzle schema to Postgres
bun run db:seed   # load seed content (idempotent)
bun run dev       # http://localhost:3000
```

## Scripts

| Script                                      | Purpose                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `bun run dev` / `build` / `start`           | Next.js dev server / production build / serve                             |
| `bun run lint` / `lint:fix`                 | ESLint (flat config; Next 16 removed `next lint`)                         |
| `bun run format` / `format:check`           | Prettier (+ Tailwind class sorting)                                       |
| `bun run typecheck`                         | `tsc --noEmit` (run after a build — Next generates `.next/types`)         |
| `bun run test`                              | Unit tests (`bun test src` — scoped so Playwright specs aren't picked up) |
| `bun run test:e2e`                          | Playwright suite (requires a prior `bun run build`)                       |
| `bun run db:push` / `db:seed` / `db:studio` | Schema push / content seed / DB browser                                   |

## The verify gate

Everything must be green before a PR (CI runs the same checks):

```bash
bun run lint && bun run format:check && bun run test && \
bun run build && bun run typecheck && bun run test:e2e
```

(`typecheck` runs after `build` because Next generates `next-env.d.ts` and `.next/types` during the build — on a clean checkout the other order fails.)

## Testing guide

- **Unit tests** (`bun test src`) run under Bun and stay **DB-free** by convention — keep pure logic in its own module (see `src/lib/streak-core.ts`) and test that, so tests need no database. (The `node-postgres` driver is Bun-loadable, so importing `src/lib/db` no longer crashes; the convention is about hermeticity, not a hard limit.)
- **E2E tests** (`e2e/*.spec.ts`) run against a production build on port 3100 with a **dedicated `mercury_e2e` database** (derived from `DATABASE_URL`, or set `E2E_DATABASE_URL` to override), reset to a pristine schema each run by `scripts/e2e-server.sh` — so the dev database is never touched. `docker compose up` creates `mercury_e2e` automatically; if you bring your own Postgres, create it once (`createdb mercury_e2e`). No Claude key is used — tests exercise the AI-degradation path.

## Commit conventions

- **Conventional Commits**: `feat:`, `fix:`, `test:`, `docs:`, `ci:`, `style:`, `chore:`; imperative subject.
- **Why-bodies**: beyond trivial edits, the body (blank line after the subject) explains _why_ — the problem, the motivation, the non-obvious tradeoff. `git log` should make sense without opening the PR.
- Branch only for large work (`<type>/<topic>` off `main`); small fixes commit straight to `main` once the verify gate is green.

## Deploying (Vercel + Neon)

1. Add **Neon** via the Vercel Marketplace (Storage → Neon). It injects `DATABASE_URL` and
   enables a database branch per preview deployment. Use the **pooled** (`-pooler`) string.
2. Provision the database once (and after any schema/content change), pointing at Neon:
   ```bash
   DATABASE_URL=<neon-pooled-url> bun run db:push
   DATABASE_URL=<neon-pooled-url> bun run db:seed
   ```
   Seeding is **not** part of `next build` — an unseeded database is an empty app.
3. Set Vercel env vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (production =
   your domain), and optionally `ANTHROPIC_API_KEY` / `MERCURY_AI_MODEL`.

## Architecture decisions

Significant, hard-to-reverse choices are recorded in [docs/adr/](docs/adr/). Write a new ADR (next number, Status/Context/Decision/Consequences) when you change a foundational technology, an integrity model, or a cross-cutting convention. Start from an existing one as a template.
