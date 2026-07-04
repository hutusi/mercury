import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createDb() {
  // DATABASE_URL points at Neon's pooled connection in production and a local
  // Docker/Homebrew Postgres in dev/CI. The Pool connects lazily, so importing
  // this module (e.g. during `next build` or unit-test collection) never opens a
  // connection or requires the URL to be set — the first query does.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return drizzle(pool, { schema });
}

// Cache on globalThis: dev hot-reload re-evaluates modules and would
// otherwise leak connection pools.
const globalForDb = globalThis as unknown as {
  __mercuryDb?: ReturnType<typeof createDb>;
};

export const db = (globalForDb.__mercuryDb ??= createDb());
