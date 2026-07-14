import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins";
import { db } from "../db";
import { siteBaseUrl } from "../site-url";

// The origin must match the request or better-auth rejects it. siteBaseUrl()
// owns the BETTER_AUTH_URL → VERCEL_URL → localhost fallback chain, shared with
// the site metadata so auth and canonical URLs never diverge.
const baseURL = siteBaseUrl();

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [baseURL],
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
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
  // nextCookies() must stay the last plugin: lets server actions set auth cookies.
  plugins: [bearer(), nextCookies()],
});
