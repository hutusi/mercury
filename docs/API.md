# HTTP API (v1)

The `/api/v1` surface exists for native clients (the iOS app); the web app keeps using server
actions and RSC reads. Both go through the same service (`src/lib/services/`) and query
(`src/lib/queries/`) layers, so behavior cannot drift between clients. The machine-readable
contract is [docs/api/openapi.yaml](api/openapi.yaml) (OpenAPI 3.1 — consumable by
`swift-openapi-generator`); a bun test (`src/lib/api/openapi-coverage.test.ts`) fails the build
when routes and spec drift apart. Decision record: [ADR 0010](adr/0010-http-api-v1-bearer-auth.md).

## Authentication

Sessions are better-auth DB sessions exposed as bearer tokens via the `bearer` plugin:

1. `POST /api/auth/sign-up/email` (`{name, email, password}`) or
   `POST /api/auth/sign-in/email` (`{email, password}`).
2. Read the **`set-auth-token`** response header and store it (iOS: Keychain).
3. Send `Authorization: Bearer <token>` on every request.
4. `POST /api/auth/sign-out` (with the header) revokes the session; on any 401, purge the token
   and re-authenticate.

Sessions live 30 days, sliding daily on use (`session.expiresIn` / `updateAge` in
`src/lib/auth/auth.ts`). Tokens are opaque and revocable — no JWT key management.

**Clients must not store cookies** (`httpShouldSetCookies = false` on iOS). better-auth also sets
a session cookie on sign-in; a client that replays it _without_ an `Origin` header trips the CSRF
check (`MISSING_OR_NULL_ORIGIN`) on later auth POSTs. Pure-bearer clients skip that code path
entirely — the e2e helper (`e2e/api-helpers.ts`) proves the flow works cookie-free.

## Conventions

- **Errors** are always `{"error": {"code", "message", "details?"}}`. `code` is the contract;
  `message` is English debug text (clients own user-facing copy). Codes: `unauthorized` (401),
  `onboarding_required` / `integrity` (403), `not_found` (404), conflicts such as
  `quiz_answer_conflict` (409), expiry such as `quiz_session_expired` (410),
  `validation_failed` (422, zod issues in `details`), `invalid_json` (400),
  `chat_limit_reached` (429), `ai_unavailable` (503), `internal` (500).
- **Locale**: responses are bilingual _data_ (`title` + `titleZh`, explanations in zh) — there is
  no `Accept-Language` handling; the client owns its UI strings.
- **Dates** are ISO 8601 strings; **exam deadlines** are epoch-ms (see below).
- **Onboarding**: track-scoped endpoints return `403 onboarding_required` until
  `PUT /api/v1/me/settings` atomically creates settings plus the learner profile. Send
  `{track, timeZone, goal?}`; `timeZone` is an IANA identifier and defaults to `Asia/Shanghai`
  when omitted.
- **Settings**: `PATCH /api/v1/me/settings` partially updates `remindersEnabled` and/or
  `timeZone`; `track` stays PUT-only because it doubles as onboarding. Both verbs and
  `GET /api/v1/me` return the same `Settings` shape.
- No pagination — list sizes mirror the web's fixed limits (history 20, recents 5,
  past submissions 10, chat thread 50).

## Learner profile and daily plan

- `GET/PATCH /api/v1/me/profile` — goals (`goalTrack`, `targetScore`, `examDate`,
  `dailyMinutes`, `selfRatedLevel`) are client-writable; `skillEstimates` and `coachMemo` are
  **server-owned** (computed from practice/exam/AI signals — [ADR 0012](adr/0012-learner-model-and-ai-memory.md))
  and silently ignored if sent. Users without a profile row get the same shape with defaults —
  never branch on null.
- **`targetScore` encoding**: TOEIC is the raw 10–990 score; **IELTS is band×10** (`65` = band
  6.5) because the column is an integer — divide by 10 for display when `goalTrack === "ielts"`.
- `GET /api/v1/plan` — the deterministic 今日计划 (due vocab → mistakes → weakest skill →
  writing/speaking cadence → mock-exam checkpoint), fitted to `dailyMinutes`. `href` values are
  unlocalized web paths; native clients should map `kind`/`refId` to their own screens.

## Vocabulary quiz integrity

The server-owned session model is recorded in
[ADR 0015](adr/0015-server-owned-vocabulary-quiz-sessions.md).

- `POST /api/v1/vocab/quiz` creates a 30-minute server-owned session. Questions and options use
  opaque ids; no content id or equality relationship reveals the answer.
- `POST /api/v1/vocab/quiz/{sessionId}/answers` accepts one `{questionId, optionId}` and returns
  `{correct, correctOptionId, completed, score?, total?}`. Repeating the identical answer is
  idempotent; changing it returns `409 quiz_answer_conflict`; expired sessions return `410
quiz_session_expired`.
- `POST /api/v1/mistakes/vocab-retest` `{wordId}` creates the same kind of one-question session,
  but only for an active mistake. Submit it through the shared answers route.

## Tutor chat

- `GET /api/v1/tutor/messages` — the rolling thread (single per user, chronological tail of 50),
  plus `enabled` (AI configured?), `dailyLimit`, and `remainingToday`.
- `POST /api/v1/tutor/messages` `{content}` — one non-streaming round-trip
  ([ADR 0013](adr/0013-tutor-chat-single-thread-non-streaming.md)); the user message and reply
  persist atomically, so a failed call stores nothing and consumes no quota. `429
chat_limit_reached` at the per-user daily cap (`MERCURY_CHAT_DAILY_LIMIT`, default 30); `503
ai_unavailable` when no provider is configured — check `enabled` from GET before showing a
  composer.

## Exam timing model

All timing is server-issued (see [ADR 0005](adr/0005-server-issued-exam-deadlines.md)):

- `POST /api/v1/exams/{examId}/attempts` (idempotent) stamps section 1's
  `{startedAt, expiresAt}`; each section submit stamps the next section's deadline.
- Deadlines are **epoch-ms**; every exam response includes `serverTime` — compute
  `remaining = expiresAt - serverTime` and count down locally instead of trusting the device
  clock.
- Autosaves (`PATCH …/answers`) and submits accept answers up to `expiresAt` + a 30s grace
  window; anything later, or for questions outside the current section, is silently dropped.
- An in-progress attempt resource only ever contains sanitized questions (no
  `correctIndex`/`explanationZh`). The keyed `review` appears on the resource strictly after
  completion.

## AI degradation contract

Writing/speaking submissions try AI grading and **never fail because of it**
([ADR 0006](adr/0006-ai-structured-output-and-degradation.md)): on any AI failure the submission
persists with `status: "self_assessed"` and `feedback: null`, and the submission detail carries a
`selfAssess: {modelAnswer, checklist}` payload plus `canRetryAi`. `POST …/retry-feedback` re-grades
(CAS-guarded, so concurrent retries are safe) and returns `503 ai_unavailable` when grading is
still impossible. Speaking clients run speech-to-text **on-device** (SFSpeechRecognizer /
AVSpeechSynthesizer for TTS) and POST the transcript — the server never handles audio.

## Odds and ends

- Streaks, daily plans, reminders, and daily AI quotas use `Settings.timeZone`. Send an IANA
  identifier detected on-device and display server-reported day/quota state; do not recompute it
  with a different timezone client-side.
- `/api/v1` has no rate limiting yet (better-auth's limiter covers `/api/auth/*` only) — noted as
  future work in ADR 0010.

## Quickstart (curl)

```bash
BASE=http://localhost:3000
TOKEN=$(curl -si $BASE/api/auth/sign-up/email -H 'content-type: application/json' \
  -d '{"name":"Dev","email":"dev@example.com","password":"password123"}' \
  | awk 'tolower($1)=="set-auth-token:" {print $2}' | tr -d '\r')
AUTH="Authorization: Bearer $TOKEN"

curl -s $BASE/api/v1/me -H "$AUTH"                            # settings: null
curl -s -X PUT $BASE/api/v1/me/settings -H "$AUTH" \
  -H 'content-type: application/json' \
  -d '{"track":"toeic","timeZone":"Asia/Shanghai"}'       # onboard
curl -s $BASE/api/v1/dashboard -H "$AUTH"                     # streak, due counts
```
