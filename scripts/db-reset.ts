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

async function resetSchema(connectionString: string) {
  const pool = new Pool({ connectionString });
  try {
    await pool.query(
      "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;",
    );
  } finally {
    await pool.end();
  }
}

async function createDatabase(connectionString: string) {
  const url = new URL(connectionString);
  const dbName = url.pathname.slice(1);
  url.pathname = "/postgres";
  const pool = new Pool({ connectionString: url.toString() });
  try {
    await pool.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await pool.end();
  }
}

async function reset() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must be set");

  try {
    await resetSchema(connectionString);
  } catch (error) {
    // 3D000 invalid_catalog_name: the scratch database doesn't exist yet — a
    // fresh machine, or a newly added scratch DB (mercury_e2e_email). Create
    // it through the `postgres` maintenance DB and retry, so e2e setup needs
    // no manual createdb step locally or in CI.
    if ((error as { code?: string }).code !== "3D000") throw error;
    await createDatabase(connectionString);
    await resetSchema(connectionString);
  }
  console.log("Schema reset.");
}

reset()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Reset failed:", error);
    process.exit(1);
  });
