import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { activityDays } from "./db/schema";
import { computeStreak, localDay } from "./streak-core";

export { computeStreak, localDay } from "./streak-core";

/** Record that the user did something today. Called by every learning action. */
export async function recordActivity(userId: string): Promise<void> {
  await db
    .insert(activityDays)
    .values({ userId, day: localDay() })
    .onConflictDoNothing();
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
