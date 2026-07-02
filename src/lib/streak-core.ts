/**
 * Pure streak logic, kept free of DB imports so it can be unit-tested under
 * Bun (which cannot load better-sqlite3 — importing src/lib/db would crash).
 */

/** Local calendar date as YYYY-MM-DD (server timezone). */
export function localDay(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Consecutive-day streak counted back from `today`, or from yesterday if the
 * user hasn't studied yet today (so the streak isn't shown broken mid-day).
 * `days` holds YYYY-MM-DD strings.
 */
export function computeStreak(days: ReadonlySet<string>, today: Date = new Date()): number {
  const cursor = new Date(today);
  if (!days.has(localDay(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(localDay(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(localDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
