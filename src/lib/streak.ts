import { desc, eq } from "drizzle-orm";
import { db, type DbExecutor } from "./db";
import { activityDays, userSettings } from "./db/schema";
import { calendarDay, computeStreak, DEFAULT_TIME_ZONE } from "./streak-core";

export { calendarDay, computeStreak, DEFAULT_TIME_ZONE } from "./streak-core";

export async function getUserTimeZone(userId: string, executor: DbExecutor = db): Promise<string> {
  const [settings] = await executor
    .select({ timeZone: userSettings.timeZone })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return settings?.timeZone ?? DEFAULT_TIME_ZONE;
}

export async function getCalendarDayForUser(
  userId: string,
  date: Date = new Date(),
  executor: DbExecutor = db,
): Promise<string> {
  return calendarDay(date, await getUserTimeZone(userId, executor));
}

/** Record that the user did something today. Called by every learning action. */
export async function recordActivity(userId: string): Promise<void> {
  await recordActivityWith(db, userId);
}

/**
 * Transaction-aware activity writer. Learning mutations use this adapter so
 * their primary row and streak day commit or roll back together.
 */
export async function recordActivityWith(
  executor: DbExecutor,
  userId: string,
  date: Date = new Date(),
): Promise<void> {
  const day = await getCalendarDayForUser(userId, date, executor);
  await executor.insert(activityDays).values({ userId, day }).onConflictDoNothing();
}

export async function getStreak(userId: string): Promise<number> {
  const [timeZone, rows] = await Promise.all([
    getUserTimeZone(userId),
    db
      .select({ day: activityDays.day })
      .from(activityDays)
      .where(eq(activityDays.userId, userId))
      .orderBy(desc(activityDays.day))
      .limit(366),
  ]);
  return computeStreak(new Set(rows.map((r) => r.day)), new Date(), timeZone);
}
