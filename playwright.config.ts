import { defineConfig, devices } from "@playwright/test";
import { e2eDatabaseUrl } from "./e2e/db-url";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Serial keeps the shared scratch database deterministic; the suite is small.
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  // Prod server + Postgres + browser share one machine: a single server
  // round-trip can occasionally exceed the 5s expect default late in the
  // suite. 10s absorbs load stalls without masking determinism bugs.
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Fresh scratch DB + push + seed + `next start`. Requires a prior `bun run build`.
    command: "bash scripts/e2e-server.sh",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      // A scratch Postgres, reset to a pristine schema on each boot (see
      // scripts/e2e-server.sh and e2eDatabaseUrl above).
      DATABASE_URL: e2eDatabaseUrl(),
      BETTER_AUTH_SECRET: "mercury-e2e-secret-not-for-production",
      // Must match the port or better-auth rejects the request origin.
      BETTER_AUTH_URL: BASE_URL,
      // Empty strings beat any real keys in .env (Next never overrides
      // pre-set env), forcing the AI-degradation path so tests never call a
      // live provider (Claude or Bailian).
      ANTHROPIC_API_KEY: "",
      DASHSCOPE_API_KEY: "",
      // Same trick for OAuth: keyless e2e must hide the social sign-in buttons
      // even when the developer's .env carries real credentials.
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      GITHUB_CLIENT_ID: "",
      GITHUB_CLIENT_SECRET: "",
      // And for email: keyless e2e must keep sign-up issuing sessions
      // immediately (no verification) and hide the reset/verify surfaces.
      RESEND_API_KEY: "",
      // Tests register users rapid-fire; disable better-auth's rate limiter.
      MERCURY_DISABLE_RATE_LIMIT: "1",
    },
  },
});
