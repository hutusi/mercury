# ADR 0006: AI structured output with keyless degradation

**Status:** Accepted (2026-07)

## Context

Writing and speaking feedback are graded by Claude. Feedback must be renderable UI data (scores, criteria, issues), not free text; the app must also work — and be CI-testable — without an API key; and learner text flows into grading prompts, which invites prompt injection.

## Decision

- **Server-only calls** via `@anthropic-ai/sdk` in server actions; the key never reaches the client.
- **Structured outputs**: `client.messages.parse()` with `zodOutputFormat(schema)` (`src/lib/ai/schemas.ts`), so responses are schema-enforced by the API and zod-validated by the SDK — no JSON scraping. Model: `claude-sonnet-5` (no sampling params — Sonnet 5 rejects them), overridable via `MERCURY_AI_MODEL`.
- **Degradation as a first-class path**: missing key, API error, `refusal`/`max_tokens` stop reasons, or a schema mismatch raise `AiUnavailableError`; the submission is stored `self_assessed` and the UI renders the seeded model answer + bilingual checklist. CI runs keyless on exactly this path.
- **Injection neutralization**: learner text has angle brackets replaced with full-width equivalents before being embedded between prompt delimiters, and the examiner persona is instructed to treat delimited content as data to grade — manipulation attempts score as off-topic.

## Consequences

- Feedback JSON persists on the submission row, so history replays without re-calling the API.
- Grading costs are bounded to explicit submissions (no background calls).
- A degraded submission is not retro-graded if a key appears later — acceptable; users can resubmit.
