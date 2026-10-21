import { cache } from "react";
import type { Track } from "../../content/types";
import {
  derivePlanStops,
  locateStop,
  summarizeRoute,
  type PlanStop,
  type RouteSummary,
  type StopMatch,
} from "../plan-status-core";
import { materializeDailyPlan, peekDailyPlan, type DailyPlanRow } from "../services/plan";
import { learnerDayRange } from "../streak-core";
import { getPlanFacts } from "./plan-facts";

/** Today's route: the frozen plan with each stop's derived status. */
export interface TodayRoute {
  /** Learner-local day (YYYY-MM-DD). */
  day: string;
  dailyMinutes: number;
  revision: number;
  stops: PlanStop[];
  summary: RouteSummary;
}

async function routeFor(row: DailyPlanRow, userId: string, timeZone: string): Promise<TodayRoute> {
  const facts = await getPlanFacts(userId, row.items, learnerDayRange(row.day, timeZone));
  const stops = derivePlanStops(row.items, facts, new Set(row.skippedKeys));
  return {
    day: row.day,
    dailyMinutes: row.dailyMinutes,
    revision: row.revision,
    stops,
    summary: summarizeRoute(stops),
  };
}

/**
 * Today's route, materializing the day's plan on first read (ADR 0033).
 * Two waves at most: the plan row, then the day's facts. cache(): the shell's
 * plan card and the Today page share one computation per request.
 */
export const getTodayRoute = cache(
  async (userId: string, track: Track, timeZone: string): Promise<TodayRoute> => {
    const row = await materializeDailyPlan(userId, track, timeZone);
    return routeFor(row, userId, timeZone);
  },
);

/** Read-only variant for session pages: null when today has no plan yet. */
export const peekTodayRoute = cache(
  async (userId: string, timeZone: string): Promise<TodayRoute | null> => {
    const row = await peekDailyPlan(userId, timeZone);
    return row ? routeFor(row, userId, timeZone) : null;
  },
);

export type FlowContext =
  | {
      mode: "plan";
      day: string;
      /** 0-based position of this session's stop. */
      index: number;
      total: number;
      stop: PlanStop;
      segments: { weight: number; status: PlanStop["status"] }[];
      next: PlanStop | null;
    }
  | { mode: "free" };

/**
 * Where a session page sits in today's route ("stop 2 of 4" and the next
 * stop), or free practice. Never creates a plan. Primitive arguments so the
 * cache() key is stable.
 */
export async function getFlowContext(
  userId: string,
  timeZone: string,
  kind: StopMatch["kind"],
  refId?: string,
): Promise<FlowContext> {
  const route = await peekTodayRoute(userId, timeZone);
  if (!route) return { mode: "free" };
  const match = (
    kind === "vocab" || kind === "mistakes" ? { kind } : { kind, refId: refId ?? "" }
  ) as StopMatch;
  const located = locateStop(route.stops, match);
  if (!located) return { mode: "free" };
  return {
    mode: "plan",
    day: route.day,
    index: located.index,
    total: route.stops.length,
    stop: located.stop,
    segments: route.stops.map((s) => ({ weight: s.estMinutes, status: s.status })),
    next: located.next,
  };
}
