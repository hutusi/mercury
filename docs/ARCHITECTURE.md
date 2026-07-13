# Architecture

Mercury is an English-learning web app for native Chinese-speaking business professionals. The product funnel drives the information architecture: users are **acquired through exam prep** (TOEIC / IELTS tracks) and **retained through practical Business English**. Cross-promotion surfaces the opposite track at high-intent moments — the mock-exam score report, exercise result screens, and the dashboard (`src/lib/crosspromo.ts`).

Everything is bilingual by design: learning material is English, scaffolding (translations, explanations, AI feedback) is Simplified Chinese, and the UI chrome switches locales.

## Stack and runtime split

| Layer     | Choice                                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack) + React 19                                                                                                            |
| Language  | TypeScript 6, zod 4 for runtime validation                                                                                                               |
| Styling   | Tailwind CSS 4 (`@theme` tokens in `src/app/globals.css`, no config file); the Lexicon design system — see [docs/DESIGN.md](DESIGN.md)                   |
| Database  | Postgres (Neon in prod) via node-postgres + Drizzle ORM — see [ADR 0007](adr/0007-postgres-neon-for-serverless.md)                                       |
| Auth      | better-auth (email/password)                                                                                                                             |
| AI        | Claude (`@anthropic-ai/sdk`) or Bailian GLM (`openai` SDK, OpenAI-compatible endpoint), server-side only — see [ADR 0011](adr/0011-multi-provider-ai.md) |
| Speech    | Browser Web Speech API (TTS + STT), no audio hosting                                                                                                     |

**Bun is the package manager and script runner; Node runs Next.js.** Next runs under Node (`bun run dev` executes the `next` binary under Node), matching Vercel's build; the seed script is `bunx tsx src/lib/db/seed.ts`, and Playwright runs under Node. Bun's own runtime is used for `bun test`. The database driver is now `node-postgres` (pure JS, Bun-loadable), so DB-touching code no longer _crashes_ under Bun as it did with better-sqlite3 — but unit tests stay DB-free by convention to keep them hermetic and fast (see [ADR 0001](adr/0001-bun-package-manager-node-runtime.md) and [ADR 0007](adr/0007-postgres-neon-for-serverless.md)).

## Directory map

```
content/                  # learning content authored as YAML (validated by src/content/types.ts)
src/
├── app/                  # App Router pages
│   ├── (auth)/           # login, register (public)
│   ├── (app)/            # all protected pages (session gate in layout)
│   ├── onboarding/       # track picker — outside (app) so the redirect can't loop
│   ├── api/auth/[...all] # better-auth catch-all
│   ├── api/v1/           # versioned HTTP API for native clients (see docs/API.md)
│   └── page.tsx          # landing (redirects to /dashboard when signed in)
├── proxy.ts              # Next 16 proxy (ex-middleware): optimistic cookie check
├── components/           # feature-scoped UI (vocab/, exam/, writing/, …)
├── content/              # zod content model (types.ts) + YAML loader (load.ts, tooling-only)
└── lib/
    ├── actions/          # server actions — thin wrappers: requireUser() + services + web side effects
    ├── services/         # mutation bodies, userId-scoped (shared by actions and API routes)
    ├── queries/          # read functions, userId-scoped (shared by pages and API routes)
    ├── api/              # HTTP plumbing: error envelope, apiHandler, requireUserApi, resources/
    ├── ai/               # provider facade (client.ts) + anthropic/bailian transports, prompts, feedback zod schemas
    ├── auth/             # better-auth config, client, session helpers
    ├── db/               # drizzle schema, singleton, seed script
    ├── i18n/             # dictionaries (zh/en), locale provider, cookie helpers
    ├── srs.ts            # SM-2 scheduler (pure)
    ├── scoring.ts        # raw % → TOEIC-scale / IELTS-band estimates (pure)
    ├── exam-utils.ts     # exam sanitization + grading (pure)
    ├── streak-core.ts    # streak computation (pure)
    ├── learner-model-core.ts # skill-estimate EWMA + coach memo + AI prompt context (pure)
    ├── plan-core.ts      # 今日计划 daily-plan engine (pure, rule-based)
    ├── chat-core.ts      # tutor-chat cap + context window (pure)
    └── speech.ts         # Web Speech helpers (client-only)
```

Pure logic (`srs`, `scoring`, `exam-utils`, `streak-core`, `learner-model-core`, `plan-core`, `chat-core`) is deliberately separated from DB access so it can be unit-tested under Bun.

## Data model

Two families of tables in `src/lib/db/schema.ts`:

- **Content tables** (seeded, ids are stable slugs like `toeic-r-001`): `vocab_words`, `reading_exercises`, `listening_exercises`, `writing_prompts`, `speaking_prompts`, `mock_exams`. Structured payloads (questions, scripts, checklists, exam sections) live in JSON columns typed via Drizzle's `$type<>()` against the zod-inferred types in `src/content/types.ts` — seed data and queries share one source of truth.
- **Progress tables** (per user): `srs_cards` (SM-2 state, unique per user+word), `review_logs`, `exercise_attempts`, `writing_submissions` / `speaking_submissions` (with stored AI feedback JSON), `mock_exam_attempts` (deadlines, answers, scores, estimate), `activity_days` (streaks), `mistake_clears` (notebook re-test clears), `user_settings` (active track, IANA timezone, reminder opt-in).
- **Learner profile** (`learner_profiles`, one row per user — [ADR 0012](adr/0012-learner-model-and-ai-memory.md)): client-writable goals (`goalTrack`, `targetScore` — IELTS as band×10, `examDate`, `dailyMinutes`, `selfRatedLevel`) plus server-owned state that only `src/lib/learner-model-core.ts` evolves — `skillEstimates` (per-skill EWMA over exercise/exam/AI signals, folded in by the services in guarded try/catch) and `coachMemo` (recurring issues/strengths merged from grading-call `memoUpdate`s, embedded into later AI prompts as the `<learner_profile>` block).

Auth tables (`user`, `session`, `account`, `verification`) are generated by `@better-auth/cli` into `src/lib/db/auth-schema.ts` — never hand-edit them; regenerate instead.

The database is Postgres, addressed by `DATABASE_URL` — Neon's pooled connection in production, a local/containerized Postgres in dev/CI/e2e. The Drizzle handle wraps a lazily-connecting `pg.Pool` and is cached on `globalThis` because dev hot-reload re-evaluates modules and would otherwise leak pools.

## Auth: four layers

1. **`src/proxy.ts`** — optimistic `getSessionCookie()` check with a redirect to `/login`. Fast, no DB read; UX only, not security. Its matcher excludes `/api`.
2. **`src/app/(app)/layout.tsx`** — authoritative `auth.api.getSession()` against Postgres; also redirects to `/onboarding` until a track is picked.
3. **`requireUser()` in every server action** (`src/lib/auth/session.ts`) — layouts do not protect server actions, so each action re-verifies the session and takes the user id from it, never from client input.
4. **`requireUserApi()`/`requireTrackApi()` in every `/api/v1` route** (`src/lib/api/auth.ts`) — same authoritative lookup, but returning 401/403 JSON envelopes instead of redirecting. Native clients authenticate with `Authorization: Bearer` via the better-auth `bearer` plugin (see [docs/API.md](API.md) and [ADR 0010](adr/0010-http-api-v1-bearer-auth.md)).

Plugin order matters: `bearer()` comes before `nextCookies()`, and `nextCookies()` must stay **last** so server actions can set cookies.

## HTTP API (v1)

`/api/v1/*` route handlers exist for native clients and are deliberately thin: `apiHandler()` (error envelope + Zod/domain-error mapping) around `requireUserApi()`/`requireTrackApi()` around the same `src/lib/services/` and `src/lib/queries/` functions the web uses — one implementation, two transports. Integrity-sensitive serialization lives in pure mappers under `src/lib/api/resources/` (e.g. an in-progress exam attempt can only serialize sanitized sections). The contract is [docs/api/openapi.yaml](api/openapi.yaml), kept honest by `src/lib/api/openapi-coverage.test.ts`; the client guide is [docs/API.md](API.md).

## i18n

Homegrown, cookie-based (see [ADR 0004](adr/0004-homegrown-i18n-over-next-intl.md)). The `Dictionary` type is derived from the zh dictionary (`DeepString<typeof zh>`), so the en dictionary cannot drift at compile time; `src/lib/i18n/dictionaries.test.ts` re-checks parity at runtime. Server components call `getDict()` (reads the `mercury_locale` cookie); client components use `useT()` from `LocaleProvider`. The first paint always derives from the cookie server-side — never `navigator.language` — to avoid hydration mismatches.

Learning content bypasses this layer entirely: every content record carries both languages as data (that _is_ the product).

## Content pipeline

YAML files in `content/` → `src/content/load.ts` (zod validation) → idempotent upsert by slug id (`bun run db:seed`). Content lives in the DB (not static imports) because progress rows reference content ids; the loader is tooling-only (seed + tests) and a guard test keeps it out of app code. Editors validate the YAML against JSON Schemas generated from zod (`bun run content:schemas`, see [ADR 0009](adr/0009-yaml-content-authoring.md)). `src/content/content.test.ts` enforces the same invariants as the seed script without needing a DB. Authoring guide: [docs/CONTENT.md](CONTENT.md).

## Exam integrity

The mock-exam mode assumes a hostile client (see [ADR 0005](adr/0005-server-issued-exam-deadlines.md)):

- `startExamAttempt` stores server-issued per-section deadlines; each subsequent section's clock starts when the previous one is submitted.
- Clients receive **sanitized** sections (`sanitizeSections` strips `correctIndex` and `explanationZh`; listening scripts must ship for TTS playback — an accepted tradeoff).
- The client countdown recomputes from `expiresAt - Date.now()` each tick and auto-submits at zero; refreshing resumes with the original clock.
- `submitExamSection` accepts answers only within `deadline + 30s` grace; late answers are discarded in favor of previously autosaved ones. Autosaves and section submits lock the attempt row before merging, so overlapping requests serialize against the latest persisted state; the web client also queues autosaves in click order.
- Grading and score estimation (`gradeExam` in `src/lib/exam-utils.ts`) run server-side against unsanitized content.

## AI feedback and degradation

AI grading is called **only server-side, from the writing/speaking services**, through the stable facade `src/lib/ai/client.ts`. Two provider transports live behind it (see [ADR 0011](adr/0011-multi-provider-ai.md)), selected by pure env resolution in `src/lib/ai/provider.ts` — `MERCURY_AI_PROVIDER=anthropic|bailian` explicit, else auto-detect by configured key (`ANTHROPIC_API_KEY` before `DASHSCOPE_API_KEY`):

- **Anthropic** (`anthropic.ts`): `messages.parse()` + `zodOutputFormat()` — the schema is enforced server-side, no JSON scraping. Default model `claude-sonnet-5`.
- **Bailian / DashScope** (`bailian.ts`): GLM via the OpenAI-compatible endpoint with `response_format: json_object` and thinking disabled (GLM structured output requires non-thinking mode); the zod-derived JSON Schema is embedded in the system prompt, the reply zod-validated, with one repair round-trip before failing. Default model `glm-5.2`.

`MERCURY_AI_MODEL` overrides the active provider's default; graded submissions persist whichever model ran (`activeAiModel()`).

Degradation is a first-class path: no configured provider, an API error, a refusal, truncation, or a schema mismatch raises `AiUnavailableError`, and the submission is stored as `self_assessed`; the UI then shows the prompt's seeded model answer plus a bilingual checklist. CI runs entirely keyless on this path.

The two cases are kept honest at view time by `isAiEnabled()`: with no provider configured the copy stays "not configured"; with a key present, a `self_assessed` submission means grading failed transiently, so the UI offers a retry. `retryWritingFeedback` / `retrySpeakingFeedback` re-grade the stored submission and upgrade it to `ai_scored`, guarded by a status-scoped compare-and-set so concurrent retries can't both write.

Learner text is untrusted: angle brackets are neutralized to full-width equivalents before being embedded in grading prompts, and the examiner system prompt instructs the model to treat `<learner_response>`/`<transcript>` content as data to grade, scoring manipulation attempts as off-topic.

Grading is **memory-infused** ([ADR 0012](adr/0012-learner-model-and-ai-memory.md)): the services prepend a `<learner_profile>` block (target, skill estimates, recurring issues, recent rubric scores — `formatLearnerContext`) so the examiner can tailor its summary and call out repeat mistakes, and the same call returns an optional `memoUpdate` that the service merges into `learner_profiles.coachMemo` plus an `overallScore` signal folded into the skill estimates. Both post-grading hooks are guarded — they never fail or degrade a submission — and the block explicitly never changes grading standards. Keyless behavior is unchanged.

## Learner model and daily plan

The AI-tutor positioning rests on two server-side systems ([ADR 0012](adr/0012-learner-model-and-ai-memory.md)):

- **Learner model** (`learner_profiles` + `src/lib/learner-model-core.ts`): goals from onboarding (target score, exam date, daily minutes, self-rating), per-skill EWMA estimates fed by exercise accuracy, exam section scores, and AI rubric scores, and the `coachMemo` of recurring issues merged from grading-call `memoUpdate`s. `recordLearnerOutcomeSafely` folds all signals and the optional memo under one profile-row lock, so concurrent outcomes cannot overwrite each other; the guarded hook never fails the parent mutation. `GET/PATCH /api/v1/me/profile`; skillEstimates/coachMemo are server-owned.
- **Daily plan** (`src/lib/plan-core.ts` + `src/lib/queries/plan.ts`): a deterministic, rule-based engine — due vocab → mistakes retest → weakest-skill practice → writing/speaking cadence → mock-exam checkpoint ramping toward the exam date — greedily fitted to `dailyMinutes` (max 5 items, never empty for fresh accounts). It is deliberately NOT an AI call: free, unit-testable, and identical keyless. The dashboard leads with it (`TodayPlanCard`); native clients read `GET /api/v1/plan`.

## Tutor chat

`/tutor` is a single rolling thread per user (`chat_messages`; [ADR 0013](adr/0013-tutor-chat-single-thread-non-streaming.md)): non-streaming (one JSON round-trip; user+assistant rows insert in one transaction, so a failed reply persists nothing and consumes no quota), with the learner profile embedded in the system prompt via `formatLearnerContext`. A per-user daily cap (`MERCURY_CHAT_DAILY_LIMIT`, default 30) is the first AI cost control — `429 chat_limit_reached`. Keyless, the tab renders a disabled composer and `POST /api/v1/tutor/messages` returns `503 ai_unavailable`. User turns are sanitized at prompt assembly; the DB stores raw text.

## Resilience

Route errors are caught before they can white-screen the app: `error.tsx` at the `(app)` and `[locale]` levels (localized, rendered inside their surrounding chrome) share one `ErrorState` body, backed by a self-contained root `global-error.tsx`; `not-found.tsx` handles bad content ids. Client runners wrap every server-action call in `try/catch` and surface a retryable inline error instead of throwing into a boundary. A single `(app)/loading.tsx` shows a hairline `PageSkeleton` while a server page's queries run. The Lexicon design rules are enforced by `src/lib/design-guard.test.ts` (part of `bun run test`), which scans component/page source for forbidden primitives (raw palette classes, shadows, gradients, `transition-all`, ungated animation, emoji glyphs).

## Streaks and SRS

Any completed learning action upserts one `activity_days` row per learner-local day in the same transaction as its primary progress row. The IANA timezone lives on `user_settings` (default `Asia/Shanghai`; [ADR 0014](adr/0014-learner-calendar-and-atomic-onboarding.md)); `calendarDay` and `computeStreak` are pure and DST-safe. `computeStreak` walks back from today — or yesterday, so a streak isn't shown broken before the first exercise of the day. Vocabulary uses SM-2 (see [ADR 0003](adr/0003-sm2-over-fsrs.md)) with four grade buttons; cards are created lazily on first review, and existing-card grades lock the row before scheduling so concurrent reviews cannot lose an advancement.

A **study reminder nudge** on the dashboard reuses this data: `src/lib/reminders-core.ts` (pure, like streak-core) decides whether to surface it — never when the user already studied today, otherwise when the streak is at risk (active yesterday, not yet today) or reviews are due. It's gated by the `user_settings.reminders_enabled` opt-out (toggle on the dashboard; `PATCH /api/v1/me/settings` for native clients). The module is delivery-agnostic by design so a future email/push channel can reuse it unchanged.

## Mistakes notebook

`/mistakes` (错题本) lists every MCQ the user answered wrongly, per active track, re-testable inline. The wrong-set is **derived at read time** — `src/lib/mistakes-core.ts` (pure, unit-tested) folds attempt history against live content answer keys — so there is no write-path hook and no backfill; only clears persist (`mistake_clears`, written by `src/lib/services/mistakes.ts` when a re-test is answered correctly). A later wrong answer in a real attempt outweighs an older clear by timestamp, reviving the mistake. Questions ship sanitized; the answer key returns only in the retest response, after answering. Vocab items re-test through a freshly regenerated question (`src/lib/vocab-quiz-core.ts`, shared with the quiz page) because original quiz distractors are never persisted — attempts store only a per-word 0/1 flag.

Vocabulary quiz integrity is session-based ([ADR 0015](adr/0015-server-owned-vocabulary-quiz-sessions.md)): `vocab_quiz_sessions` stores the hidden word ids,
opaque question/option ids, owner, purpose, expiry, and accepted answers. The public resource is
sanitized by `vocab-quiz-core`; `services/vocab-quiz.ts` locks the session and grades one answer at
a time. Identical retries are idempotent, conflicting retries fail with 409, and only completion
writes the practice attempt or mistake clear. Normal quizzes and vocab mistake re-tests share this
module and its 30-minute lifetime.

## Browser speech

`src/lib/speech.ts` wraps SpeechSynthesis (TTS) and SpeechRecognition (STT, Chrome/Edge only). Components using them are client-only and render behind a mounted-gate (`setMounted(true)` in an effect) because the APIs don't exist during SSR — rendering capability-dependent UI before mount would mismatch hydration. TTS speaks one utterance per script line since Chrome silently cuts long utterances, and always cancels on unmount to prevent zombie audio.
