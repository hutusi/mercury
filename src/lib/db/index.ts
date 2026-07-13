import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createDb() {
  // DATABASE_URL points at Neon's pooled connection in production and a local
  // Docker/Homebrew Postgres in dev/CI. The Pool connects lazily, so importing
  // this module (e.g. during `next build` or unit-test collection) never opens a
  // connection or requires the URL to be set — the first query does.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  // pg surfaces failures on *idle* clients (Neon recycling a connection, a
  // network blip) as an `error` event on the Pool; with no listener Node treats
  // it as uncaught and exits. The pool discards the broken client and recovers
  // on its own, so logging is enough — we must not let it crash the server.
  pool.on("error", (err) => {
    console.error("Unexpected error on idle Postgres client", err);
  });
  return drizzle(pool, { schema });
}

// Cache on globalThis: dev hot-reload re-evaluates modules and would
// otherwise leak connection pools.
const globalForDb = globalThis as unknown as {
  __mercuryDb?: ReturnType<typeof createDb>;
};

export const db = (globalForDb.__mercuryDb ??= createDb());

/** Database surface shared by the root database and transaction adapters. */
export type DbExecutor = Pick<typeof db, "insert" | "update" | "select" | "query">;
