# ADR 0017: Immutable exam-attempt snapshots and explicit abandonment

**Status:** Accepted (2026-07)

## Context

Exam attempts previously stored answers and deadlines but re-read `mock_exams.sections` for every autosave, submit, grade, and report. A content seed during an active attempt could therefore change its question set or answer key. The old `expired` state also had no explicit lifecycle: an unreachable in-progress attempt could keep start idempotency pinned without giving the learner a deliberate way to restart.

## Decision

- Starting an attempt stores the complete unsanitized `sections` JSON on that attempt. Timing, answer filtering, grading, mistake derivation, and reports use this immutable snapshot. Clients still receive only `sanitizeSections(snapshot)` until completion.
- Migration 0009 backfills existing attempts from their exam's current content before making the snapshot non-null. This preserves the best available interpretation for historical rows.
- Attempt status is `in_progress | completed | abandoned`. An owner-scoped, idempotent abandon operation converts only in-progress attempts and stamps `abandonedAt`; completed attempts cannot be abandoned.
- Abandoned attempt resources contain lifecycle metadata only. They never return saved answers, a score, or review keys. Only completed attempts may expose the unsanitized review.
- Exam TTS permits one playback per mounted runner as an honest-exam UX constraint. This is not treated as a security boundary because listening scripts necessarily reach the client.
- The content seed validates the whole corpus first and performs all table upserts in one transaction, preventing a partially published content version.

## Consequences

- Active and completed attempts remain stable across content edits and seed runs.
- Attempt rows duplicate section JSON. The storage cost is accepted in exchange for durable exam history and auditability.
- Abandoning releases start idempotency so the learner can begin a fresh attempt, but an abandoned attempt can never become a report.
- Existing attempts are only as historically accurate as the live content available when migration 0009 runs.
