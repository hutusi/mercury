import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import type { Track } from "../../content/types";
import { db, type DbExecutor } from "../db";
import { dailyPlans } from "../db/schema";
import type { PlanItem } from "../plan-core";
import { derivePlanStops, mergeRegeneratedItems, planItemKey } from "../plan-status-core";
import { getPlanFacts } from "../queries/plan-facts";
import { buildFreshPlan } from "../queries/plan-inputs";
import { calendarDay, learnerDayRange, shiftCalendarDay } from "../streak-core";
import { ConflictError, NotFoundError } from "./errors";

export type DailyPlanRow = typeof dailyPlans.$inferSelect;

/**
 * Today's plan row, created on the first read of the learner-local day
 * (ADR 0033). Lazily materializing on a GET is deliberate and idempotent:
 * concurrent first reads race on the primary key and all read the winner.
 * A row marked stale by a goal edit regenerates its untouched tail here.
 */
export async function materializeDailyPlan(
  userId: string,
  track: Track,
  timeZone: string,
  now: Date = new Date(),
): Promise<DailyPlanRow> {
  const day = calendarDay(now, timeZone);
  const existing = await selectPlan(userId, day);
  if (existing && !existing.stale) return existing;

  const fresh = await buildFreshPlan(userId, track, timeZone, now);

  if (!existing) {
    const [inserted] = await db
      .insert(dailyPlans)
      .values({ userId, day, items: fresh.items, dailyMinutes: fresh.dailyMinutes })
      .onConflictDoNothing()
      .returning();
    if (inserted) return inserted;
    const winner = await selectPlan(userId, day);
    if (!winner) throw new Error("daily plan vanished after a conflicting insert");
    return winner;
  }

  // Stale: keep what the learner already did, skipped, or began; refill the
  // rest from the new goal. Optimistic on revision, which every write to the
  // row bumps: a skip or a newer goal edit that lands mid-regeneration fails
  // the swap, and the row it left (still stale) is served as-is — the next
  // read regenerates from current data. Retrying here would not help: this
  // request's profile read is cache()d, so it would rebuild the same plan.
  const facts = await getPlanFacts(userId, existing.items, learnerDayRange(day, timeZone));
  const stops = derivePlanStops(existing.items, facts, new Set(existing.skippedKeys));
  const items = mergeRegeneratedItems(stops, fresh.items);
  const keys = new Set(items.map(planItemKey));
  const [updated] = await db
    .update(dailyPlans)
    .set({
      items,
      dailyMinutes: fresh.dailyMinutes,
      skippedKeys: existing.skippedKeys.filter((k) => keys.has(k)),
      stale: false,
      revision: existing.revision + 1,
      updatedAt: now,
    })
    .where(
      and(
        eq(dailyPlans.userId, userId),
        eq(dailyPlans.day, day),
        eq(dailyPlans.revision, existing.revision),
      ),
    )
    .returning();
  return updated ?? (await selectPlan(userId, day)) ?? existing;
}

async function selectPlan(userId: string, day: string): Promise<DailyPlanRow | undefined> {
  const [row] = await db
    .select()
    .from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day)))
    .limit(1);
  return row;
}

/** Read-only: today's row if it exists (session pages never create one). */
export async function peekDailyPlan(
  userId: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<DailyPlanRow | undefined> {
  return selectPlan(userId, calendarDay(now, timeZone));
}

export const SetPlanSkipSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  key: z.string().min(1).max(200),
  skipped: z.boolean(),
});

/**
 * Skip (or un-skip) a stop in today's plan. The day travels with the request
 * so a stale screen left open past midnight can't skip a stop in the new
 * day's plan: 409 plan_day_changed tells the client to reload.
 */
export async function setPlanItemSkippedForUser(
  userId: string,
  timeZone: string,
  input: unknown,
  now: Date = new Date(),
): Promise<void> {
  const { day, key, skipped } = SetPlanSkipSchema.parse(input);
  if (day !== calendarDay(now, timeZone)) {
    throw new ConflictError("The plan's day has ended", "plan_day_changed");
  }
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(dailyPlans)
      .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day)))
      .for("update")
      .limit(1);
    if (!row || !row.items.some((item: PlanItem) => planItemKey(item) === key)) {
      throw new NotFoundError(`No stop ${key} in the plan for ${day}`);
    }
    const next = new Set(row.skippedKeys);
    if (skipped) next.add(key);
    else next.delete(key);
    await tx
      .update(dailyPlans)
      .set({
        skippedKeys: [...next],
        revision: sql`${dailyPlans.revision} + 1`,
        updatedAt: now,
      })
      .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.day, day)));
  });
}

/**
 * Called when the learner edits a goal that shapes the plan (track, daily
 * minutes, exam date, self-rated level), in the same transaction as the edit.
 * Recent rows are marked stale (from yesterday in UTC, which covers today in
 * every timezone); the next read regenerates them. The revision bumps even
 * on a row that is already stale, so a regeneration still building from the
 * previous goal can't land over this one. Skill-estimate and memo updates
 * never come through here — the plan must not rotate while the learner works
 * through it.
 */
export async function markDailyPlanStaleWith(
  executor: DbExecutor,
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  await executor
    .update(dailyPlans)
    .set({ stale: true, revision: sql`${dailyPlans.revision} + 1`, updatedAt: now })
    .where(
      and(
        eq(dailyPlans.userId, userId),
        gte(dailyPlans.day, shiftCalendarDay(calendarDay(now, "UTC"), -1)),
      ),
    );
}
