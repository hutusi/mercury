# ADR 0016: Persisted mistakes read model

**Status:** Accepted (2026-07)

## Context

The mistakes notebook originally rebuilt every learner's current wrong set on each dashboard, plan, notebook, and re-test request. It loaded all exercise/exam attempts and clears, loaded every referenced content row, reconstructed answer-key maps, and folded the entire history in memory. Dashboard and plan could perform the same work independently. Cost grew without bound, and changing live content could reinterpret historical answers.

## Decision

- `mistake_states` stores one row per `(user, kind, refId, questionId)` with track, wrong count, latest wrong time, and latest resolving time.
- Trusted exercise, vocabulary-session, and completed-exam grading call `recordMistakeOutcomes` inside the same transaction as the attempt. A wrong outcome upserts/increments the row; a correct outcome resolves an existing row without creating never-wrong clutter.
- Notebook re-tests retain `mistake_clears` as durable events and update the read model in the same transaction. A row is active when it has no clear time or `lastWrongAt > clearedAt`; a later real mistake therefore revives it automatically.
- Timestamp maxima make the result independent of concurrent commit order. The module owns this invariant; callers submit only trusted question outcomes.
- Migration 0008 backfills idempotently from existing exercise attempts, completed exams, live content answer keys, and clear events. The pure `mistakes-core` fold remains as the semantic reference and test oracle for rebuilds, not a request-time path.
- Dashboard and plan counts use an indexed aggregate over current state. The notebook loads only current rows and the small set of content records needed to decorate them.

## Consequences

- Read cost is proportional to current mistakes rather than lifetime practice history, and repeated consumers share one source of truth.
- Attempt transactions perform a small upsert/update per graded question. This write amplification is bounded by exercise size and accepted for predictable reads.
- Deleted or renamed live content can leave undecoratable state rows; the notebook omits those rows. Exam-attempt content snapshots separately preserve historical exam truth.
