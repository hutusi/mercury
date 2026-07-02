# Contributing

## Prerequisites

- **Bun 1.3+** — package manager, script runner, and unit-test runner.
- **Node.js ≥ 20.9** (development uses 24/26) — the actual runtime for Next.js, the seed script, and Playwright. Both are required: Bun cannot load better-sqlite3, so all DB-touching code runs under Node ([ADR 0001](docs/adr/0001-bun-package-manager-node-runtime.md)).

## Setup

```bash
bun install
cp .env.example .env
# set BETTER_AUTH_SECRET, e.g.:  openssl rand -base64 32
# optional: ANTHROPIC_API_KEY enables AI grading (the app degrades gracefully without it)

bun run db:push   # create data/mercury.db
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

- **Unit tests** (`bun test src`) run under Bun and must stay **DB-free** — importing anything that reaches `src/lib/db` crashes on better-sqlite3. Put pure logic in its own module (see `src/lib/streak-core.ts`) and test that.
- **E2E tests** (`e2e/*.spec.ts`) run against a production build on port 3100 with a scratch database (`.e2e/mercury-e2e.db`, reset each run by `scripts/e2e-server.sh`). The dev database is never touched. No Claude key is used — tests exercise the AI-degradation path.

## Commit conventions

- **Conventional Commits**: `feat:`, `fix:`, `test:`, `docs:`, `ci:`, `style:`, `chore:`; imperative subject.
- **Why-bodies**: beyond trivial edits, the body (blank line after the subject) explains _why_ — the problem, the motivation, the non-obvious tradeoff. `git log` should make sense without opening the PR.
- Branch only for large work (`<type>/<topic>` off `main`); small fixes commit straight to `main` once the verify gate is green.

## Architecture decisions

Significant, hard-to-reverse choices are recorded in [docs/adr/](docs/adr/). Write a new ADR (next number, Status/Context/Decision/Consequences) when you change a foundational technology, an integrity model, or a cross-cutting convention. Start from an existing one as a template.
