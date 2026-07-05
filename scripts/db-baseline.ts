// One-time utility: brings a database that already has the full schema (from
// a prior `drizzle-kit push` run, before this repo adopted versioned
// migrations) under migration control, without re-running the baseline
// migration's DDL there. Drizzle's migrator only checks the single most
// recent bookkeeping row's timestamp (see docs/adr/0008-versioned-migrations-on-deploy.md),
// so inserting one correct row for the baseline migration is enough - it
// makes db:migrate treat that migration as already applied and move on to
// whatever comes after it.
//
// Only ever targets the first (baseline) migration. Never run this against a
// database that's already under migration control (it refuses if the
// bookkeeping table is non-empty) or against an empty database (use
// db:migrate there instead - it'll apply the baseline cleanly).
//
// Usage: DATABASE_URL=<unpooled-connection-string> bunx tsx scripts/db-baseline.ts
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");
const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

async function baseline() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL must be set");

  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8"),
  );
  const [entry] = journal.entries;
  if (!entry) throw new Error("No migrations found in drizzle/meta/_journal.json");

  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, `${entry.tag}.sql`), "utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex");

  const pool = new Pool({ connectionString });
  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATIONS_SCHEMA}`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const { rows } = await pool.query(
      `SELECT count(*)::int AS count FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`,
    );
    if (rows[0].count > 0) {
      throw new Error(
        `${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} already has rows - this database is already ` +
          "under migration control (or was already baselined). Use db:migrate instead.",
      );
    }

    await pool.query(
      `INSERT INTO ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (hash, created_at) VALUES ($1, $2)`,
      [hash, entry.when],
    );
    console.log(`Baselined ${entry.tag} (hash ${hash.slice(0, 12)}...) without running its SQL.`);
  } finally {
    await pool.end();
  }
}

baseline()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Baseline failed:", error);
    process.exit(1);
  });
