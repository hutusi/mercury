# ADR 0005: Server-issued exam deadlines

**Status:** Accepted (2026-07)

## Context

Mock exam mode is the product's acquisition centerpiece; its score estimates are only meaningful if timing and grading can't be gamed. Client clocks, timers, and payloads are all untrusted: a local countdown can be paused by tab throttling, extended by refreshing, or edited in devtools.

## Decision

The server is the source of truth for time and correctness:

- `startExamAttempt` stores per-section `{ startedAt, expiresAt }` on the attempt row; a section's clock starts only when the previous section is submitted.
- Clients receive **sanitized** sections — `correctIndex` and `explanationZh` are stripped (`sanitizeSections`). Listening scripts do ship, because client-side TTS must speak them; that leak is accepted and documented.
- The client countdown derives remaining time from `expiresAt - Date.now()` on every tick (never a decrementing counter) and auto-submits at zero; refresh resumes against the same stored deadline.
- `submitExamSection` accepts new answers only until `expiresAt + 30s` grace; afterwards only previously autosaved answers count. UPDATEs are guarded on `status = 'in_progress'` and the expected section index so stale or duplicate requests can't overwrite advanced state.
- Grading and score estimation (`gradeExam`) run server-side against unsanitized content.

Answers additionally mirror to `localStorage` (client convenience for refresh) and autosave to the server every 30 seconds.

## Consequences

- Refreshing, throttling, or editing the client buys no time and reveals no answers.
- A failed submission is retryable (the client un-marks the section); retrying after expiry is safe because the server clamps late answers.
- Section durations must be long enough that honest network latency fits inside the grace window.
