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
export function e2eDatabaseUrl(dbName = "mercury_e2e"): string {
  // E2E_DATABASE_URL (like DATABASE_URL) supplies host + credentials only —
  // the database name is ALWAYS forced per server, so the boot-time
  // destructive reset can never aim at an unexpected database, and the two
  // e2e servers can never collide on one scratch DB.
  const base = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base) return `postgresql://localhost:5432/${dbName}`;
  const url = new URL(base);
  url.pathname = `/${dbName}`;
  return url.toString();
}
