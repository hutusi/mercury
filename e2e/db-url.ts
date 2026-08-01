/**
 * The scratch database the e2e server boots against. Shared between
 * playwright.config.ts (webServer env) and specs that shell out to CLI
 * scripts against the same database (admin.spec.ts), so the two can't drift.
 *
 * The E2E server resets its database on every boot (drops the `public`
 * schema), so it must target a dedicated `mercury_e2e` database and never the
 * dev one. Inherit host + credentials from DATABASE_URL when present
 * (Docker/CI), so only the database name is forced; fall back to a local
 * trust-auth Postgres.
 */
export function e2eDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) return "postgresql://localhost:5432/mercury_e2e";
  const url = new URL(base);
  url.pathname = "/mercury_e2e";
  return url.toString();
}
