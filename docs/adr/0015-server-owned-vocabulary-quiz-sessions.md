# ADR 0015: Server-owned vocabulary quiz sessions

**Status:** Accepted (2026-07)

## Context

The original vocabulary quiz sent each target word id and option word ids to the client. Correctness was the visible equality `question.wordId === option.wordId`, so a client could obtain a perfect score without knowing any vocabulary. The submit mutation also trusted an arbitrary track and arbitrary word-id map, allowing fabricated attempts to influence the learner model and mistakes notebook. Vocab mistake re-tests reused the same equality leak.

## Decision

- A quiz begins by creating a `vocab_quiz_sessions` row owned by the user. It stores track, purpose (`practice` or `mistake_retest`), hidden word ids, opaque question/option ids, accepted answers, and a 30-minute expiry.
- The public question shape contains only opaque ids, direction, prompt, and option text. `sanitizeQuizQuestion` is the single serialization interface; hidden content ids never cross it.
- Clients submit one `{questionId, optionId}` at a time. The session row is locked before grading. Repeating the identical answer returns the same result; changing an accepted answer returns `409 quiz_answer_conflict`.
- Completing a practice session writes exactly one exercise attempt and learner signal. Completing a one-question mistake session clears the mistake only when correct. Both write activity in the same transaction.
- Vocab mistake sessions can be created only for the owner's currently active mistake and snapshot its `lastWrongAt` generation. A correct answer clears only that exact generation; if a newer wrong answer has since revived it, the session rolls back and returns `410 mistake_session_stale`. A wrong retry creates a fresh session instead of changing the accepted answer in an existing one.
- Visible option labels are unique within each question. Questions without at least one distinct distractor are omitted instead of presenting an ambiguous one-option quiz.
- Web server actions and HTTP v1 routes call the same quiz-session module. The intentional v1 replacement removes the old GET-with-key and bulk word-id submit contract.

## Consequences

- Quiz scores and vocab learner signals are based only on server-issued questions, and browser/native clients have the same integrity model.
- Per-answer grading adds a network round trip before feedback; the existing immediate reveal becomes a short pending state.
- Expired rows require eventual retention cleanup. The expiry index supports a later scheduled delete without changing the interface.
