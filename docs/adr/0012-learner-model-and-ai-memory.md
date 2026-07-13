# ADR 0012: Learner model and AI memory

**Status:** Accepted (2026-07)

## Context

Mercury's repositioning — "最懂你的 AI 英语私教：从托业/雅思备考，到职场实战" — promises an AI tutor that _knows_ the learner. Before this ADR, the product had rich per-user signals (SM-2 review logs, exercise answer maps, exam section scores, AI rubric criteria buried in submission JSON) but nothing aggregated them: the entire profile was `user_settings.activeTrack` plus an orphaned `dailyGoal`, every AI grading call was stateless, and the dashboard was a catalog rather than a plan. "最懂你" requires a substrate: goals, a measured level, and a memory the AI can see.

## Decision

- **One `learner_profiles` row per user** (PK `userId`): goal fields (`goalTrack`, `targetScore`, `examDate`, `dailyMinutes`, `selfRatedLevel`) are client-writable; `skillEstimates` and `coachMemo` are **server-owned** — they evolve only through `src/lib/learner-model-core.ts` and are never accepted from clients.
- **Deterministic skill estimates, not an AI judgment.** Each skill (listening/reading/writing/speaking/vocab) holds `{estimate 0–100, confidence, updatedAt}`, seeded from the onboarding self-rating and updated by an EWMA over observed signals: exams move the estimate most (k=0.5), AI rubric scores next (0.35), practice exercises least (0.25). Measured sources (exam, AI) set confidence to high; exercises cap at medium. Placement is self-rating only — no diagnostic flow; estimates converge from real practice.
- **Coach memo as AI-visible memory.** A capped list of recurring issues (8) and strengths (5), each `{tag, noteZh, count, lastSeenAt}` merged by stable English slug tags. Updates ride the _existing_ grading call (an optional `memoUpdate` field on the feedback schemas), so memory costs zero extra AI calls. The memo is embedded in future prompts via a deterministic `<learner_profile>` block (`formatLearnerContext`), with memo strings passed through `sanitizeUntrusted` because they originated from model output.
- **Signal hooks never fail the parent mutation.** Services submit a complete outcome (one or more signals plus an optional memo update) through one guarded interface after their own writes commit. The learner-profile row is locked while the outcome is folded, so concurrent learning actions cannot overwrite each other; a profile failure logs and moves on.
- **`dailyMinutes` is a new column; `user_settings.dailyGoal` stays.** `dailyGoal` (a card count) is baked into the v1 API contract; silently repurposing it as minutes would break native clients. It is marked deprecated in the OpenAPI spec for later removal.
- **IELTS targets stored as band×10** (65 = band 6.5): one integer column serves TOEIC and IELTS; clients divide by 10 when `goalTrack === "ielts"`.

## Consequences

- The AI grader can reference the learner's target and recurring mistakes ("上次你也犯了这个错"), and the daily plan engine (`plan-core`) has a weakness map to prioritize against — both read the same profile row.
- Estimates are explainable and testable (pure functions, DB-free unit tests) at the cost of statistical sophistication; if EWMA proves too crude, the update rule can change without touching storage.
- Goals are track-specific: after a track switch, `goalTrack` lags `activeTrack` and consumers (plan engine, prompt context) skip the target rather than misapply it.
- Pre-existing users may have no row; `ensureLearnerProfile` lazily creates defaults, and the API serializer returns a default shape so clients never branch on null. New onboarding creates settings and the profile atomically ([ADR 0014](0014-learner-calendar-and-atomic-onboarding.md)).
