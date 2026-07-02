import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

function createDb() {
  // MERCURY_DB_PATH lets tests and CI point at scratch databases.
  const dbPath = process.env.MERCURY_DB_PATH ?? path.join(process.cwd(), "data", "mercury.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

// Cache on globalThis: dev hot-reload re-evaluates modules and would
// otherwise leak SQLite handles.
const globalForDb = globalThis as unknown as {
  __mercuryDb?: ReturnType<typeof createDb>;
};

export const db = (globalForDb.__mercuryDb ??= createDb());
