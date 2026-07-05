// Applies pending Drizzle migrations from ./drizzle. Runs once per deploy via
// the `vercel-build` script, before `next build` - a failed migration must
// fail loudly and abort the build rather than ship app code against a stale
// schema, so this opens its own short-lived connection (the app's cached
// singleton in ./index.ts never closes its pool) and exits non-zero on error.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Arbitrary fixed key: serializes concurrent migration runs against the same
// database (e.g. two overlapping deploys) via a Postgres advisory lock.
const LOCK_KEY = 727_310_001;

async function main() {
  // Prefer the direct/unpooled connection: PgBouncer transaction-mode pooling
  // can hand a session-scoped advisory lock to a different backend between
  // statements. Neon's Vercel integration injects DATABASE_URL_UNPOOLED
  // alongside the pooled DATABASE_URL.
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must be set");

  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied.");
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
    client.release();
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
