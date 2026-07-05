// Drop and recreate the `public` schema so E2E runs start from a pristine
// database. Replaces the old `rm -f mercury.db` file reset: Postgres can't be a
// throwaway file, and `reuseExistingServer` locally would otherwise retain users
// and trip the `email` unique index across runs.
//
// Also drops the `drizzle` schema, where db:migrate keeps its bookkeeping
// table - otherwise a second run would find last run's bookkeeping row still
// there, think the baseline migration was already applied, and skip
// recreating the (just-wiped) tables in `public`.
//
// Only ever point this at a scratch/e2e database (it destroys all data).
import { Pool } from "pg";

async function reset() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must be set");

  const pool = new Pool({ connectionString });
  try {
    await pool.query(
      "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;",
    );
    console.log("Schema reset.");
  } finally {
    await pool.end();
  }
}

reset()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Reset failed:", error);
    process.exit(1);
  });
