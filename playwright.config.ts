import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// The E2E server resets its database on every boot (drops the `public` schema),
// so it must target a dedicated `mercury_e2e` database and never the dev one.
// Inherit host + credentials from DATABASE_URL when present (Docker/CI), so only
// the database name is forced; fall back to a local trust-auth Postgres.
function e2eDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) return "postgresql://localhost:5432/mercury_e2e";
  const url = new URL(base);
  url.pathname = "/mercury_e2e";
  return url.toString();
}

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
      // scripts/e2e-server.sh and e2eDatabaseUrl above).
      DATABASE_URL: e2eDatabaseUrl(),
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
