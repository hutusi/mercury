# ADR 0026: Social sign-in via env-conditional Google/GitHub OAuth

**Status:** Accepted (2026-08)

## Context

Mercury only offered email/password sign-up — real friction for a consumer learning app. better-auth ships OAuth providers and the generated `account` table has carried `providerId`/`accountId` since migration 0000, so the plumbing is cheap; the real decisions are which providers fit the audience and how linking behaves. Google is blocked in mainland China (it serves overseas/international users), GitHub is reachable but developer-shaped, and the two natural mainland options are both deferred: **WeChat** website-app OAuth requires an enterprise-verified 微信开放平台 account (business license) that we don't have, and **phone + SMS OTP** — the dominant mainland pattern — is a separate feature with its own SMS-provider and anti-abuse work. A further constraint: Vercel preview deploys have per-deploy URLs that can no more be registered as OAuth redirect URIs than they can be predicted, and keyless dev/CI/e2e must keep working (the same contract the AI features honor).

## Decision

- **Google + GitHub only, web-only redirect flow.** Both are better-auth built-ins configured in `src/lib/auth/auth.ts`; no new tables, no migration. The native (bearer) social flow — `POST /api/auth/sign-in/social` with a provider `idToken` — is future work and deliberately absent from the API contract.
- **Env-conditional registration is the feature flag.** `enabledSocialProviders(env)` (`src/lib/auth/social-providers.ts`, pure and DB-free) enables a provider only when both its `*_CLIENT_ID` and `*_CLIENT_SECRET` are non-empty; empty string counts as unset so `playwright.config.ts` can blank the vars. The same helper feeds the better-auth config and, via the `(auth)` layout → `SocialProvidersContext`, the login/register buttons — server truth and UI cannot drift. No keys → no buttons, no divider, nothing: dev, CI, e2e, and preview deploys run keyless. No `oauth-proxy` plugin; previews deliberately have no social login rather than proxying callbacks through production.
- **Account linking ships better-auth's defaults** — no `accountLinking` config, no `trustedProviders`. Implicit linking requires the _existing local user_ to be `emailVerified`. Mercury has no email-verification flow, so password users are never verified and password→OAuth with a matching email fails with `account_not_linked` (surfaced on the login/register pages with copy telling the learner to use their password). OAuth-created users _are_ verified, so signing in with Google then GitHub on the same email links into one user. This is the safe direction: no unverified-email takeover vector, loosened later by adding verification rather than by weakening the check now (better-auth is deprecating the ability to turn it off anyway).
- **The `(auth)` layout forces dynamic rendering** so the button list reflects the runtime env, not whatever `.env` was present at `next build` (the keyless e2e server reuses a build made with the developer's keys).
- All `signIn.social` redirect URLs (`callbackURL`, `newUserCallbackURL`, `errorCallbackURL`) are **locale-prefixed** — an unprefixed path makes `src/proxy.ts` 307-hop the OAuth return and re-derive the locale from the cookie instead of the page the user was on.

## Consequences

- Operators enable the feature per environment: register `<origin>/api/auth/callback/<provider>` and set the two vars (Vercel: Production scope only). GitHub OAuth Apps take a single callback URL, so dev and prod use separate apps; one Google client can hold both URIs.
- New OAuth users flow through the existing onboarding gate unchanged — `newUserCallbackURL` lands on `/onboarding`, and the `(app)` layout enforces it regardless.
- WeChat (needs a company entity) and phone OTP (own feature) stay deferred; when email verification lands, password↔OAuth implicit linking starts working without contract changes, and an explicit `linkSocial` settings surface can follow.
- Button labels must never contain 登录/注册/"Sign in"/"Sign up" as substrings: Playwright role-name matching is substring-based and the e2e helpers click buttons by those names.
