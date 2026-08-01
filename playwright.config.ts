import { defineConfig, devices } from "@playwright/test";
import { e2eDatabaseUrl } from "./e2e/db-url";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// Email-enabled twin server (ADR 0028): same app, but with a fake Resend key
// so the verification surfaces the keyless server can never execute — the
// /link-social gate and the unverified banner — run under CI. The fake key is
// delivery-free: Resend rejects it instantly and sendEmail degrades silently
// (the designed outage path — "API key is invalid" in server logs is
// expected). The fake Google creds only exist so a *permitted* link-social
// can prove itself with a locally generated authorize URL; no OAuth callback
// ever runs.
const EMAIL_PORT = 3101;
const EMAIL_BASE_URL = `http://localhost:${EMAIL_PORT}`;

// Empty strings beat any real keys in .env (Next never overrides pre-set
// env), forcing the degradation paths so tests never call a live provider.
const sharedServerEnv = {
  BETTER_AUTH_SECRET: "mercury-e2e-secret-not-for-production",
  ANTHROPIC_API_KEY: "",
  DASHSCOPE_API_KEY: "",
  GITHUB_CLIENT_ID: "",
  GITHUB_CLIENT_SECRET: "",
  // Tests register users rapid-fire; disable better-auth's rate limiter.
  MERCURY_DISABLE_RATE_LIMIT: "1",
};

export default defineConfig({
  testDir: "./e2e",
  // Serial keeps the shared scratch databases deterministic; the suite is small.
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
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /email-auth\.spec\.ts/,
    },
    {
      name: "chromium-email",
      use: { ...devices["Desktop Chrome"], baseURL: EMAIL_BASE_URL },
      testMatch: /email-auth\.spec\.ts/,
    },
  ],
  webServer: [
    {
      // Fresh scratch DB + push + seed + `next start`. Requires a prior `bun run build`.
      command: "bash scripts/e2e-server.sh",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...sharedServerEnv,
        PORT: String(PORT),
        // A scratch Postgres, reset to a pristine schema on each boot (see
        // scripts/e2e-server.sh and e2eDatabaseUrl above).
        DATABASE_URL: e2eDatabaseUrl(),
        // Must match the port or better-auth rejects the request origin.
        BETTER_AUTH_URL: BASE_URL,
        // Keyless: social buttons and every email-auth surface stay absent.
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
        RESEND_API_KEY: "",
      },
    },
    {
      command: "bash scripts/e2e-server.sh",
      url: EMAIL_BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...sharedServerEnv,
        PORT: String(EMAIL_PORT),
        DATABASE_URL: e2eDatabaseUrl("mercury_e2e_email"),
        BETTER_AUTH_URL: EMAIL_BASE_URL,
        RESEND_API_KEY: "re-e2e-fake-never-sends",
        GOOGLE_CLIENT_ID: "e2e-fake-google-id",
        GOOGLE_CLIENT_SECRET: "e2e-fake-google-secret",
      },
    },
  ],
});
