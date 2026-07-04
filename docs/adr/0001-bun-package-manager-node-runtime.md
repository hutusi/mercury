# ADR 0001: Bun as package manager, Node as runtime

**Status:** Accepted (2026-07). Partly relaxed by
[ADR 0007](0007-postgres-neon-for-serverless.md): the database is now Postgres via
`node-postgres` (pure JS, Bun-loadable), so the better-sqlite3 napi constraint that forced
the Bun/Node split no longer applies. The split and DB-free unit tests are retained as
conventions (parity with Vercel's Node build; hermetic, fast tests), not hard requirements.

## Context

The project standardized on Bun for developer experience (fast installs, native TS execution, built-in test runner). The database is SQLite via better-sqlite3, a napi native module that Bun cannot load ([oven-sh/bun#4290](https://github.com/oven-sh/bun/issues/4290)). Running Next.js entirely under the Bun runtime (`bun --bun next dev`) also has known compatibility gaps with Next 16 internals.

## Decision

Use Bun as the **package manager, script runner, and unit-test runner** only. Everything that touches the database runs under **Node**:

- Next.js (plain `bun run dev` executes the `next` binary under Node).
- The seed script: `db:seed` is `bunx tsx src/lib/db/seed.ts` (Node ESM rejects the repo's extensionless imports, so tsx bridges the gap).
- Playwright (its CLI runs under Node).

`bun test src` runs only pure modules; DB access in a Bun-executed test crashes at import time.

## Consequences

- Pure logic must be separated from DB access to stay unit-testable (`srs.ts`, `scoring.ts`, `exam-utils.ts`, `streak-core.ts`).
- CI pins Node explicitly (`actions/setup-node`) so better-sqlite3's prebuilt binary matches the ABI.
- Switching to `bun:sqlite` would collapse the split but couples the app to the Bun runtime for Next — revisit if Bun ships napi support.
