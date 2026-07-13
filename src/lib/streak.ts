import { desc, eq } from "drizzle-orm";
import { db, type DbExecutor } from "./db";
import { activityDays } from "./db/schema";
import { computeStreak, localDay } from "./streak-core";

export { computeStreak, localDay } from "./streak-core";

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
  day: string = localDay(),
): Promise<void> {
  await executor.insert(activityDays).values({ userId, day }).onConflictDoNothing();
}

export async function getStreak(userId: string): Promise<number> {
  const rows = await db
    .select({ day: activityDays.day })
    .from(activityDays)
    .where(eq(activityDays.userId, userId))
    .orderBy(desc(activityDays.day))
    .limit(366);
  return computeStreak(new Set(rows.map((r) => r.day)));
}
