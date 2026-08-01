import { after } from "next/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer } from "better-auth/plugins";
import { db } from "../db";
import { isEmailEnabled } from "../email/enabled";
import { sendEmail } from "../email/send";
import { resetPasswordEmail, verificationEmail } from "../email/templates";
import { siteBaseUrl } from "../site-url";
import { enabledSocialProviders } from "./social-providers";

// The origin must match the request or better-auth rejects it. siteBaseUrl()
// owns the BETTER_AUTH_URL → VERCEL_URL → localhost fallback chain, shared with
// the site metadata so auth and canonical URLs never diverge.
const baseURL = siteBaseUrl();

// Social sign-in (ADR 0026): a provider registers only when both its env vars
// are set — keyless dev/CI/e2e/preview run without social login entirely.
const socialProviderIds = enabledSocialProviders(process.env);

// Transactional email (ADR 0027): a single RESEND_API_KEY switches on required
// email verification for password sign-up plus the password-reset flow.
// Keyless environments keep the old behavior — sign-up issues a session
// immediately, which e2e and the native API contract depend on.
// Account linking stays on better-auth's defaults: implicit linking requires
// an IdP-verified email AND an emailVerified local user. With verification
// enforced, password users become verifiable, so password↔OAuth same-email
// linking works once the user verifies — and stays blocked
// (`account_not_linked`) for unverified accounts, which is the anti-takeover
// property we want.
const emailEnabled = isEmailEnabled(process.env);

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [baseURL],
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    ...(emailEnabled
      ? {
          requireEmailVerification: true,
          // A stolen session must not survive a password reset.
          revokeSessionsOnPasswordReset: true,
          // Param types are explicit: contextual typing does not flow into
          // conditional spreads, so the callbacks would otherwise be implicit any.
          // Emails are dispatched via after(), post-response: awaiting the
          // provider round-trip would make registered-email requests measurably
          // slower than unknown-email ones (a timing oracle on the
          // enumeration-safe endpoints) and adds provider latency to sign-up.
          sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
            after(() => sendEmail({ to: user.email, ...resetPasswordEmail({ url }) }));
          },
        }
      : {}),
  },
  ...(emailEnabled
    ? {
        emailVerification: {
          sendOnSignUp: true,
          // An unverified sign-in attempt re-sends the link before the 403 —
          // the login page's "we just sent a fresh link" copy depends on it.
          sendOnSignIn: true,
          autoSignInAfterVerification: true,
          sendVerificationEmail: async ({
            user,
            url,
          }: {
            user: { email: string };
            url: string;
          }) => {
            after(() => sendEmail({ to: user.email, ...verificationEmail({ url }) }));
          },
        },
      }
    : {}),
  ...(socialProviderIds.length > 0
    ? {
        socialProviders: {
          ...(socialProviderIds.includes("google")
            ? {
                google: {
                  clientId: process.env.GOOGLE_CLIENT_ID!,
                  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                  // Always show the account chooser — learners often share machines.
                  prompt: "select_account" as const,
                },
              }
            : {}),
          ...(socialProviderIds.includes("github")
            ? {
                github: {
                  clientId: process.env.GITHUB_CLIENT_ID!,
                  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
                },
              }
            : {}),
        },
      }
    : {}),
  // E2E tests register users rapid-fire and would trip better-auth's
  // production rate limiter; only scripts/e2e-server.sh sets this flag.
  // The localhost check is the backstop: even if the env var leaks into a
  // real deployment, rate limiting stays on for non-local origins.
  ...(process.env.MERCURY_DISABLE_RATE_LIMIT === "1" && baseURL.startsWith("http://localhost")
    ? { rateLimit: { enabled: false } }
    : {}),
  // Native clients can't silently re-login, so give sessions a 30-day cap;
  // getSession slides the expiry at most once a day. Applies to web cookies too.
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  // bearer(): native clients send the session token (from the `set-auth-token`
  // response header) as `Authorization: Bearer` instead of a cookie.
  // admin(): puts `role` on session.user; a null role means defaultRole, so
  // existing rows need no backfill. Admins are minted via `bun run admin:grant`.
  // nextCookies() must stay the last plugin: lets server actions set auth cookies.
  plugins: [bearer(), admin({ defaultRole: "user", adminRoles: ["admin"] }), nextCookies()],
});
