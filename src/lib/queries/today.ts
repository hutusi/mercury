import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { ExamTrack, Track } from "../../content/types";
import { db } from "../db";
import { activityDays, mockExamAttempts, type ExamEstimate } from "../db/schema";
import type { CoachMemo } from "../learner-model-core";
import { calendarDay, computeStreak, weekDots, type WeekDot } from "../streak-core";
import { getStopTitles } from "./plan-titles";
import { getTodayRoute, type TodayRoute } from "./plan";
import { getLearnerProfile } from "./profile";

export interface TodayPageData {
  route: TodayRoute;
  titles: Map<string, string>;
  streak: number;
  week: WeekDot[];
  checkedIn: boolean;
  /** No learning activity ever — the first-run note shows. */
  isNewUser: boolean;
  exam: {
    track: ExamTrack;
    examDate: string | null;
    targetScore: number | null;
    lastEstimate: ExamEstimate | null;
  } | null;
  coachMemo: CoachMemo | null;
}

/** Everything the Today page shows, in two waves (route + facts, then titles). */
export async function getTodayPageData(
  userId: string,
  track: Track,
  timeZone: string,
): Promise<TodayPageData> {
  const today = calendarDay(new Date(), timeZone);
  const [route, profile, activity, lastEstimate] = await Promise.all([
    getTodayRoute(userId, track, timeZone),
    getLearnerProfile(userId),
    db
      .select({ day: activityDays.day })
      .from(activityDays)
      .where(eq(activityDays.userId, userId))
      .orderBy(desc(activityDays.day))
      .limit(366),
    track === "business"
      ? Promise.resolve(null)
      : db
          .select({ estimate: mockExamAttempts.estimate })
          .from(mockExamAttempts)
          .where(
            and(
              eq(mockExamAttempts.userId, userId),
              eq(mockExamAttempts.track, track),
              eq(mockExamAttempts.status, "completed"),
              isNotNull(mockExamAttempts.estimate),
            ),
          )
          .orderBy(desc(mockExamAttempts.completedAt))
          .limit(1)
          .then((rows) => rows[0]?.estimate ?? null),
  ]);
  const titles = await getStopTitles(route.stops);
  const days = new Set(activity.map((a) => a.day));

  return {
    route,
    titles,
    streak: computeStreak(days, today),
    week: weekDots(days, today),
    checkedIn: days.has(today),
    isNewUser: days.size === 0,
    exam:
      track === "business"
        ? null
        : {
            track,
            examDate: profile?.examDate ?? null,
            targetScore: profile?.targetScore ?? null,
            lastEstimate,
          },
    coachMemo: profile?.coachMemo ?? null,
  };
}
