import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { activityDays } from "./db/schema";

/** Local calendar date as YYYY-MM-DD (server timezone). */
export function localDay(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Record that the user did something today. Called by every learning action. */
export async function recordActivity(userId: string): Promise<void> {
  await db
    .insert(activityDays)
    .values({ userId, day: localDay() })
    .onConflictDoNothing();
}

/**
 * Consecutive-day streak counted back from today, or from yesterday if the
 * user hasn't studied yet today (so the streak isn't shown broken mid-day).
 */
export async function getStreak(userId: string): Promise<number> {
  const rows = await db
    .select({ day: activityDays.day })
    .from(activityDays)
    .where(eq(activityDays.userId, userId))
    .orderBy(desc(activityDays.day))
    .limit(366);
  if (rows.length === 0) return 0;

  const days = new Set(rows.map((r) => r.day));
  const cursor = new Date();
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
