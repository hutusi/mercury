# ADR 0018: Idempotent AI grading with an exact daily budget

**Status:** Accepted (2026-07)

## Context

Writing and speaking submissions called the configured AI provider before persisting anything. A client retry after a lost response could buy and store the same grading twice, concurrent retries could both reach the provider before their final compare-and-set, and there was no cost ceiling for these structured-output calls. The existing chat cap did not cover graders and its count-after-the-fact pattern was not strong enough for paid-call accounting.

## Decision

- Every writing/speaking submit and retry carries a client-generated UUID `requestId`, unique per user. `ai_grading_requests` stores the input fingerprint, operation scope, lifecycle status, result submission id, and a random claim id.
- Replaying a completed request with the same input returns the original submission. Reusing the id for different input is a conflict. A fresh in-progress request or scope returns `409 grading_in_progress` before an AI call.
- A claim older than two minutes is considered abandoned and can be reclaimed. Every claim receives a new random `claimId`; final persistence compares it so a superseded worker cannot publish a late result.
- `ai_usage_days` holds a shared writing/speaking call count per user and learner-local calendar day. Claiming locks this row and increments before the provider call. The default limit is 10 (`MERCURY_AI_GRADING_DAILY_LIMIT`); exhaustion returns `429 ai_grading_limit_reached`.
- A failed paid provider attempt still consumes its claimed call. A later retry creates or reclaims a request and consumes another call. When no provider is configured, initial submissions still use idempotency but degrade without incrementing paid usage; retry returns `503 ai_unavailable` before claiming.
- Publishing a submission and marking its request completed happen in one database transaction.

## Consequences

- Network retries are safe and the daily cost ceiling is exact under concurrency.
- The two-minute lease bounds how long a crashed worker can block a grading scope. A very slow provider response may be superseded; its cost is still counted, but its late result is rejected.
- Native clients must generate and retain a UUID until a terminal response. This is an intentional v1 contract break while the API has no external release guarantee.
