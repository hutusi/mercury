import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

function createDb() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const sqlite = new Database(path.join(dir, "mercury.db"));
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
