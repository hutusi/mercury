import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Serial keeps the shared scratch database deterministic; the suite is small.
  workers: 1,
  retries: process.env.CI ? 2 : 0,
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
      // scripts/e2e-server.sh). CI injects the service-container URL.
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/mercury_e2e",
      BETTER_AUTH_SECRET: "mercury-e2e-secret-not-for-production",
      // Must match the port or better-auth rejects the request origin.
      BETTER_AUTH_URL: BASE_URL,
      // Empty string beats any real key in .env (Next never overrides pre-set
      // env), forcing the AI-degradation path so tests never call Claude.
      ANTHROPIC_API_KEY: "",
      // Tests register users rapid-fire; disable better-auth's rate limiter.
      MERCURY_DISABLE_RATE_LIMIT: "1",
    },
  },
});
