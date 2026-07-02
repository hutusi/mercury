import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // SQLite is single-writer and the suite is small — serial keeps it flake-free.
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
      MERCURY_DB_PATH: path.join(__dirname, ".e2e", "mercury-e2e.db"),
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
