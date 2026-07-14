import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createDb() {
  // DATABASE_URL points at Neon's pooled connection in production and a local
  // Docker/Homebrew Postgres in dev/CI. The Pool connects lazily, so importing
  // this module (e.g. during `next build` or unit-test collection) never opens a
  // connection or requires the URL to be set — the first query does.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // A dashboard/plan render fans out ~25 queries at once. With max:5 that
    // "parallel" batch drained in ~5-6 serial round-trip waves — the dominant
    // content-latency cost. Widen it so an uncontended request's fan-out runs
    // largely in parallel (~1-2 waves; concurrent requests share these
    // connections and can queue); still safely small in front of Neon's pooler.
    max: 20,
    // Keep sockets warm between refreshes: without this, pg closed idle clients
    // after 10s and every refresh paid a fresh TLS handshake to Neon.
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    idleTimeoutMillis: 30_000,
    // Fail fast on a bad connection instead of hanging the request forever.
    connectionTimeoutMillis: 10_000,
  });
  // pg surfaces failures on *idle* clients (Neon recycling a connection, a
  // network blip) as an `error` event on the Pool; with no listener Node treats
  // it as uncaught and exits. The pool discards the broken client and recovers
  // on its own, so logging is enough — we must not let it crash the server.
  pool.on("error", (err) => {
    console.error("Unexpected error on idle Postgres client", err);
  });
  // Register the pool with Vercel Fluid Compute's instance lifecycle. Fluid can
  // suspend an instance with JS timers paused, so `idleTimeoutMillis` alone
  // won't reliably reap idle clients and a widened `max` could accumulate
  // connections across instances/deploys; attachDatabasePool ties the pool to
  // that lifecycle so its connections are cleaned up as an instance suspends.
  // No-op off Vercel (local/dev), so it's safe everywhere.
  attachDatabasePool(pool);
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
