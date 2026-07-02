import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "../db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  // E2E tests register users rapid-fire and would trip better-auth's
  // production rate limiter; only scripts/e2e-server.sh sets this flag.
  // The localhost check is the backstop: even if the env var leaks into a
  // real deployment, rate limiting stays on for non-local origins.
  ...(process.env.MERCURY_DISABLE_RATE_LIMIT === "1" &&
  (process.env.BETTER_AUTH_URL ?? "").startsWith("http://localhost")
    ? { rateLimit: { enabled: false } }
    : {}),
  // Must stay the last plugin: lets server actions set auth cookies.
  plugins: [nextCookies()],
});
