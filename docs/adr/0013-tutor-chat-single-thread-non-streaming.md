# ADR 0013: Tutor chat — single rolling thread, non-streaming, daily cap

**Status:** Accepted (2026-07)

## Context

The AI-tutor repositioning ([ADR 0012](0012-learner-model-and-ai-memory.md)) includes a conversational surface: a tutor tab where the learner can ask anything, with the learner profile as context. This is the first open-ended (per-message, user-initiated) AI cost in the app — grading was bounded to explicit submissions — and the first plain-text (non-structured) AI call across both provider transports.

## Decision

- **One rolling thread per user, one `chat_messages` table.** The product story is a continuous tutor relationship — the memory IS the thread. No thread management UI, no `chat_threads` table; a `threadId` column plus backfill can introduce threads later if ever needed. The context window is the last 20 turns; a leading assistant turn after slicing is dropped (Anthropic requires user-first).
- **Non-streaming v1.** One JSON round-trip per turn, because: (1) the ADR 0010 error envelope doesn't compose with mid-stream failures; (2) the user and assistant rows insert in **one transaction** after a complete reply — a failed AI call persists nothing, never strands a user message, and doesn't consume quota; (3) the web client sends via a plain server action like every other mutation; (4) `max_tokens: 1024` plus a "2–6 sentences" prompt bounds latency to a typing-indicator wait; (5) a single JSON POST is the simplest native contract; (6) keyless e2e wouldn't exercise streaming anyway. Upgrade path: add an SSE variant of `POST /api/v1/tutor/messages` (deltas + terminal event with the persisted id) keeping JSON as the default.
- **Per-user daily message cap** — the app's first AI cost control: user-role rows are counted per `(userId, day)` (`day` = `localDay()`, the `activity_days` convention); `MERCURY_CHAT_DAILY_LIMIT` (default 30, min 1) → `429 chat_limit_reached`. Two concurrent sends can both pass the count check; accepted — this is cost control, not billing.
- **Keyless degradation**: the tab renders with a disabled input and an explanatory callout; `GET` reports `enabled: false`; `POST` → `503 ai_unavailable`. Server actions return a discriminated union instead of throwing, because production Next masks action error messages.
- **Injection hygiene as elsewhere**: user turns pass through `sanitizeUntrusted` at prompt assembly (DB stores raw text); the system prompt pins the tutor role and treats `<learner_profile>` as non-instructional context. GLM keeps `enable_thinking: false` on the plain-text path too — here a latency/cost choice, distinct from the structured-output constraint (ADR 0011).
- Chatting calls `recordActivity` — a tutor conversation counts as study activity for streaks.

## Consequences

- Replies feel slower than streaming UIs (~2–5s behind a typing indicator); acceptable for coaching-length answers, revisit with the SSE upgrade if usage says otherwise.
- The cap makes tutor cost per user per day boundable: ≤ limit × (context window + 1024 output tokens).
- A single thread means no per-topic organization; the coach memo (ADR 0012), not the chat log, is the durable memory across features.
