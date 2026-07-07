# ADR 0010: Versioned HTTP API (/api/v1) with better-auth bearer tokens

**Status:** Accepted (2026-07)

## Context

A native iOS client is planned as a full peer of the web app. Nothing in the codebase was
consumable from Swift: all mutations were Next.js server actions (RSC-bound RPC with unstable
action ids), all reads were inline Drizzle queries in server components, and auth was cookie-only
with `requireUser()` _redirecting_ to `/login` rather than returning 401. An HTTP surface had to
be added without forking business logic between two clients — exam integrity
([ADR 0005](0005-server-issued-exam-deadlines.md)) and AI degradation
([ADR 0006](0006-ai-structured-output-and-degradation.md)) must hold identically over HTTP.

## Decision

**REST under `/api/v1` (URL versioning), sharing one service/query layer with the web.**

- Action bodies moved to `src/lib/services/*` (explicit `userId`, Zod parse, domain errors);
  server actions became thin wrappers keeping `requireUser()` + web-only side effects
  (`revalidatePath`/redirects). Inline RSC reads moved to `src/lib/queries/*`; pages and route
  handlers call the same functions. Neither layer may carry `"use server"`.
- **Auth: the better-auth `bearer` plugin** (ordered before `nextCookies()`, which stays last).
  It reuses the existing `session` table — the token in the `set-auth-token` response header _is_
  the session token, so tokens are opaque, revocable, and need no schema change or key
  management. This is why bearer won over the `jwt` plugin. Native clients must not store
  cookies: better-auth's origin check rejects cookie-bearing requests without an `Origin` header,
  while cookie-free bearer requests skip CSRF entirely. Sessions: 30-day cap, daily sliding
  refresh (applies to web cookies too — accepted).
- `requireUserApi()`/`requireTrackApi()` (`src/lib/api/auth.ts`) return 401/403 JSON envelopes
  where the web helpers redirect. `apiHandler()` centralizes the error contract:
  `{error: {code, message, details?}}` with ZodError→422, NotFoundError→404, IntegrityError→403,
  AiUnavailableError→503.
- Integrity-sensitive serialization is centralized in pure mappers (e.g. `toAttemptResource` in
  `src/lib/api/resources/exams.ts`): in-progress exam attempts only ever serialize
  `sanitizeSections()` output; keys appear strictly post-completion. DB-free unit tests serialize
  both shapes to prove it.
- **Contract: hand-maintained OpenAPI 3.1** (`docs/api/openapi.yaml`) with a two-way drift-guard
  test, instead of zod-to-openapi generation: the surface is ~28 stable endpoints, the Zod
  schemas describe inputs only (response shapes are TS), so generation would still leave half the
  spec hand-written while adding a dependency and a registry layer. iOS consumes the YAML via
  `swift-openapi-generator`.

## Consequences

- The web app is unchanged in behavior; the browser e2e suite doubles as the regression net for
  the extraction. New API behavior is pinned by request-level e2e specs running pure-bearer.
- Every future feature lands as service + query first, then a thin action _and_ a thin route —
  one implementation, two transports.
- Endpoint changes must touch `docs/api/openapi.yaml` or the coverage test fails the gate.
- Deferred: rate limiting on `/api/v1` (better-auth's limiter covers only `/api/auth/*`),
  `Accept-Language` (responses are bilingual data; clients own UI strings), pagination
  (list sizes mirror the web's fixed limits), and push notifications for SRS due reminders.
