import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins";
import { db } from "../db";

// Production sets BETTER_AUTH_URL to the real domain (takes precedence). Preview
// deployments have a per-deploy URL, so fall back to VERCEL_URL; local dev falls
// back to localhost. The origin must match the request or better-auth rejects it.
const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

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
