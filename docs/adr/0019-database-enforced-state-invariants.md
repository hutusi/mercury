# ADR 0019: Database-enforced state invariants

**Status:** Accepted (2026-07)

## Context

Mercury validates client input with Zod and centralizes mutations in services, but its Postgres tables previously accepted arbitrary text states and impossible numeric/lifecycle combinations. TypeScript's `$type<>()` annotations disappear at runtime. A faulty migration, future service, operational script, or concurrent edge case could therefore persist a row that every reader assumes is impossible: a score above its total, an unknown status, a negative quota, or an in-flight lease with no start time.

## Decision

- App-owned user-state tables define named Postgres `CHECK` constraints for finite track/kind/status/role values, nonnegative counts and intervals, bounded scores and durations, and `YYYY-MM-DD` learner-day strings.
- Multi-column lifecycle checks keep exam completion/abandonment timestamps, grading request results, and chat lease fields consistent with their status.
- AI-scored submissions require feedback and a model id. Vocabulary mistake sessions require a source word while ordinary practice sessions forbid one.
- Zod remains the public validation layer because it produces useful 422 details. Database checks are the last integrity boundary and are expected to surface as internal errors if service validation ever drifts.
- Generated better-auth tables are not hand-edited. Nested JSON payload shape remains enforced by the content/AI Zod schemas because duplicating deep structure in SQL would be brittle.
- Constraints are named and shipped through migration 0013 so violations are diagnosable and deployments validate existing rows before accepting the migration.

## Consequences

- Impossible scalar/lifecycle state is rejected regardless of write path, including manual SQL.
- Schema changes that add a new enum member or lifecycle state must update TypeScript/Zod, the database check, migrations, and the OpenAPI contract together.
- A bad legacy row blocks migration rather than silently carrying corruption forward; operators must repair it explicitly.
