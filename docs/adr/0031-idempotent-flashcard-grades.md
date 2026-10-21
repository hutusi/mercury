# ADR 0031: Idempotent flashcard grades with a pre-review snapshot

**Status:** Accepted (2026-10)

## Context

Flashcard grading (`gradeCardForUser`) was the one learner write without an idempotency key. Its transaction prevented a _half-applied_ grade, but not a _double-applied_ one: when the server commits and the response is lost (a flaky mobile network, a cold Neon connection timing out the client), `StudySession` shows "retry" and the learner's next press advances the SM-2 schedule a second time and writes a second review log. Exercise attempts, book quizzes, exam starts, and AI grading already use client request ids (ADR 0018); vocab grading did not.

The upcoming Daybreak redesign also adds **undo the last grade**, which needs to restore a card exactly — something the review log could not do, because it only stored the previous interval.

## Decision

- `review_logs` gains `request_id` (partial unique per user), the card's full pre-review scheduler snapshot (`prev_ease_factor`, `prev_repetitions`, `prev_lapses`, `prev_due_at`, `prev_last_reviewed_at`, alongside the existing `previous_interval_days`), and `created_card` (this review lazily created the card). A check constraint keeps the snapshot all-or-nothing; legacy rows carry none.
- `POST /api/v1/vocab/grade` and the `gradeCard` action accept an optional `requestId` (UUID). The web client always sends one, **keyed by queue position, not by grade**: a retry replays the stored review even if the learner taps a different button, and the response's `grade` (the original) is what the client acts on (only an original "Forgot" re-queues the card).
- The replay check runs **after** the card row lock, so a concurrent twin waits and then sees the committed log; a unique violation on the index is the last barrier and resolves the same way. Reusing an id for a different word is `409 grade_request_conflict` (a typed `conflict` result in the action).
- Replays recompute the original result from the snapshot (`scheduleReview` is deterministic) rather than storing post-state columns. `reviewedAt` is written with the same clock read as the card's `lastReviewedAt`.
- The response adds `reviewId`, `grade`, and `replayed`; `intervalDays` and `srs` are unchanged.

## Consequences

- A lost response can no longer double-advance a card or inflate review counts; the study session can retry freely.
- The snapshot makes an exact undo possible: `POST /api/v1/vocab/reviews/{reviewId}/undo` (and the `undoGrade` action) reverts only the card's latest review, within 10 minutes, restoring the snapshot or deleting a lazily-created card; `activity_days` is never touched, so the streak doesn't flicker.
- `requestId` stays optional, so existing native clients are unaffected but also unprotected until they send one.
- Each review log row is a few columns wider; review logs are already per-review, so this is linear in reviews, not a new growth axis.
