# ADR 0028: Soft email verification — sign in freely, gate only linking

**Status:** Accepted (2026-08) — amends the enforcement portion of [ADR 0027](0027-transactional-email-resend.md); its provider, email-module, password-reset, and linking-defaults decisions stand.

## Context

ADR 0027 shipped strict verification: `requireEmailVerification` made password sign-up return no session and unverified sign-in a 403. In practice that is a conversion cliff for a consumer learning app — a new learner cannot even look around until they leave the product for their inbox — and it makes account access hostage to email deliverability, a real risk given Resend's weaker reach into mainland inboxes. Meanwhile the only thing local verification actually _protects_ is account-linking legitimacy: password reset proves inbox ownership on its own, and the app has no other email-trusting flows.

A load-bearing better-auth detail forced one design choice: the **explicit** `POST /link-social` endpoint (used by the settings page) checks _nothing_ about the local user's `emailVerified` — only the _implicit_ linking path (OAuth sign-in matching an existing email) enforces it. Under strict verification the gap was unreachable because unverified users had no sessions; under soft verification it must be closed by our own code.

## Decision

- **Drop `requireEmailVerification`; keep `sendOnSignUp: true`** (explicitly — better-auth defaults it from the now-absent flag). Sign-up issues a session and sends the verification email in the same request; new users flow straight into onboarding. `autoSignInAfterVerification` and the whole `/verify-email` landing keep working (a link clicked while signed in reuses the session).
- **A persistent, quiet banner replaces the wall.** The `(app)` layout renders `VerifyEmailBanner` when `isEmailEnabled(process.env) && !session.user.emailVerified` — the env gate is mandatory (keyless environments cannot send the email and every keyless e2e user is unverified). The banner's resend uses the session's own email; a stale `EMAIL_ALREADY_VERIFIED` response is treated as success, and with no session cookie-cache configured the banner clears on the next navigation after verification. Known scope limit: `/onboarding` sits outside the `(app)` group, so brand-new users first meet the banner on the dashboard — accepted.
- **The single verification-gated operation is explicit social linking** (user-decided; no AI or change-password gates). Enforced server-side by a global `hooks.before` middleware in `betterAuth()` that 403s (`EMAIL_NOT_VERIFIED`) on `/link-social` for unverified sessions, mirrored by a disabled Connect button + hint in settings. better-auth accepts a **single** global before-hook that runs on every endpoint including server-side `auth.api.*` calls — the path guard stays the first statement, and future global gates must compose inside it. Implicit linking keeps better-auth's default local-`emailVerified` gate, so the anti-takeover property of ADR 0026/0027 is unchanged.

## Consequences

- Sign-up enumeration returns in email-enabled environments: duplicate emails now get a 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (mapped to friendly copy) instead of ADR 0027's synthetic token-null response. Accepted — keyless environments always behaved this way, and the enumeration-hardened surfaces (password reset, resend-verification) stay hardened.
- The native API contract simplifies back: sign-up always returns a token + `set-auth-token`; the sign-in 403 `EMAIL_NOT_VERIFIED` path is gone (the code now only appears on `/link-social`).
- Explicit linking never flips the local `emailVerified` (better-auth only does that on implicit paths), so the banner clears only through actual verification — consistent, no shortcut.
- An environment with social keys but no email key would leave `/link-social` ungated (the hook rides the email conditional). Accepted: both key sets are Production-only today, and such an environment could never verify anyone anyway.
- Rollout is config-free: no migration, no env change. Existing unverified users sign in normally after deploy and see the banner.
