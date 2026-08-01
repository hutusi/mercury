# ADR 0025: Membership as orthogonal roles and tiers

**Status:** Accepted (2026-08)

## Context

Mercury had no user roles and no paid tiers. The two AI cost controls — the tutor chat daily cap ([ADR 0013](0013-tutor-chat-single-thread-non-streaming.md)) and the AI grading budget ([ADR 0018](0018-idempotent-ai-grading-budget.md)) — were global env vars, identical for every user. [ADR 0024](0024-book-reading-pregenerated-recall.md) explicitly deferred "an entitlement story" for premium features like bring-your-own-book uploads. Monetization needs that story, plus an operator role to grant memberships, and neither concept existed in the schema. A complication: the word "plan" is already load-bearing for the daily study plan (`plan-core.ts`, `/api/v1/plan`, the i18n `plan` section), so the subscription concept needs a different vocabulary.

## Decision

- **Two orthogonal models, never conflated.** _Role_ (`user`/`admin`) is authorization — who may administer. _Tier_ (`free`/`premium`) is entitlement — what capacity a learner gets. An admin is not automatically premium, and vice versa. The subscription vocabulary is **membership/tier**; "plan" stays reserved for the daily study plan.
- **Roles ride the better-auth `admin()` plugin**, not an app table: `auth-schema.ts` is generated-never-hand-edited, so a role column must come from a plugin anyway, and this one adds typed `session.user.role` plus ban/impersonation machinery for later. `role` is nullable with no DB default — the plugin treats `null` as `defaultRole` (`"user"`), so existing rows need no backfill; code compares `=== "admin"` and serializes `role ?? "user"`. The plugin would also mount `/api/auth/admin/*` endpoints (set-role, impersonate, ban, remove-user, …) via the existing catch-all; the auth route handler **blocks that whole prefix with a 404** — even for admins — because our model never uses them (admin mutations go through our own guarded server actions, and role promotion happens only via `bun run admin:grant <email>`, since bootstrap can't have an admin session) and a leaked admin token must not be able to impersonate or delete users.
- **Tier is a server-owned `memberships` table where absence of row = free.** One row per premium user: `tier` (CHECK `'premium'`), nullable `expiresAt` (null = no expiry), `grantedBy` (FK, `set null`), `source` (CHECK `'manual'`, extensible when billing lands), timestamps. Revoke **deletes** the row so "no row = free" stays the single representation; an expired row also resolves to free and a re-grant upserts over it. A real audit trail arrives with billing events, not before.
- **Entitlements resolve in a pure core** (`src/lib/membership-core.ts`): `resolveTier(row, now)` and `entitlementsForTier(tier, env)`. At launch premium only raises the two AI quotas (`MERCURY_CHAT_DAILY_LIMIT_PREMIUM` default 100, `MERCURY_AI_GRADING_DAILY_LIMIT_PREMIUM` default 30, both clamped to never be below the free values). Future hard gates land as booleans on the same `Entitlements` record; the `premium_required` error contract (403) ships now so they need no contract work.
- **Guards:** `requireAdmin()` beside `requireUser()` — signed-out → login redirect, signed-in non-admin → `notFound()` so the admin surface is never advertised. `requireAdminApi()` is deliberately deferred: admin is web-only (server actions), and minting the `admin_required` API code before any native admin surface exists would be dead contract.
- **Admin services deviate from userId-scoping**: `src/lib/services/memberships.ts` takes `(actorId, input)` because actor ≠ target; the `requireAdmin()` gate lives in the calling action, per the "layouts don't protect actions" rule.
- The entitlement read happens **before** the quota claim transactions, never under the row locks; a mid-flight revoke lets one in-flight call finish under the old limit — the same blast radius as an env-var change.

## Consequences

- Premium can be operated today (admin grants with optional expiry) and a payment provider later only extends `source` and writes the same table — no remodeling.
- The `/admin` page lives in the `(app)` group, so an admin must be an onboarded learner first — acceptable; admins are normal users.
- Quota checks now cost one extra indexed read per gated mutation (cached per request via React `cache()`).
- Adding a premium feature = one boolean on `Entitlements` + a `PremiumRequiredError` throw at the feature's service; the 403 `premium_required` envelope and client conventions already exist.
