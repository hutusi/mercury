import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import type { Track } from "../../content/types";
import { db } from "../db";
import {
  activityDays,
  exerciseAttempts,
  mockExamAttempts,
  speakingSubmissions,
  srsCards,
  vocabWords,
  writingSubmissions,
} from "../db/schema";
import { countActiveMistakes } from "../mistakes";
import { reminderState } from "../reminders-core";
import { calendarDay, getStreak, getUserTimeZone } from "../streak";
import { shiftCalendarDay } from "../streak-core";

/** Everything the dashboard shows, in one round of parallel queries. */
export async function getDashboardData(userId: string, track: Track) {
  const today = new Date();
  const timeZone = await getUserTimeZone(userId);
  const todayDay = calendarDay(today, timeZone);
  const yesterdayDay = shiftCalendarDay(todayDay, -1);

  const [
    streak,
    dueRows,
    lastExam,
    inProgressExam,
    recentExercises,
    recentWriting,
    recentSpeaking,
    recentExams,
    firstActivity,
    activeMistakes,
    recentActivity,
  ] = await Promise.all([
    getStreak(userId),
    db
      // pg returns bigint counts as strings; mapWith keeps the API numeric.
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(srsCards)
      .innerJoin(vocabWords, eq(srsCards.wordId, vocabWords.id))
      .where(
        and(
          eq(srsCards.userId, userId),
          eq(vocabWords.track, track),
          lte(srsCards.dueAt, new Date()),
        ),
      ),
    db.query.mockExamAttempts.findFirst({
      where: and(eq(mockExamAttempts.userId, userId), eq(mockExamAttempts.status, "completed")),
      orderBy: desc(mockExamAttempts.completedAt),
    }),
    db.query.mockExamAttempts.findFirst({
      where: and(eq(mockExamAttempts.userId, userId), eq(mockExamAttempts.status, "in_progress")),
      orderBy: desc(mockExamAttempts.startedAt),
    }),
    db.query.exerciseAttempts.findMany({
      where: eq(exerciseAttempts.userId, userId),
      orderBy: desc(exerciseAttempts.completedAt),
      limit: 5,
    }),
    db.query.writingSubmissions.findMany({
      where: and(eq(writingSubmissions.userId, userId), eq(writingSubmissions.status, "ai_scored")),
      orderBy: desc(writingSubmissions.createdAt),
      limit: 5,
    }),
    db.query.speakingSubmissions.findMany({
      where: and(
        eq(speakingSubmissions.userId, userId),
        eq(speakingSubmissions.status, "ai_scored"),
      ),
      orderBy: desc(speakingSubmissions.createdAt),
      limit: 5,
    }),
    db.query.mockExamAttempts.findMany({
      where: and(eq(mockExamAttempts.userId, userId), eq(mockExamAttempts.status, "completed")),
      orderBy: desc(mockExamAttempts.completedAt),
      limit: 5,
    }),
    // Any completed activity ever — drives the first-run guidance.
    db.query.activityDays.findFirst({ where: eq(activityDays.userId, userId) }),
    countActiveMistakes(userId, track),
    // Today/yesterday only — all the reminder nudge needs.
    db
      .select({ day: activityDays.day })
      .from(activityDays)
      .where(
        and(eq(activityDays.userId, userId), inArray(activityDays.day, [todayDay, yesterdayDay])),
      ),
  ]);

  const dueCount = dueRows[0]?.count ?? 0;

  return {
    streak,
    dueCount,
    reminder: reminderState({
      days: new Set(recentActivity.map((r) => r.day)),
      dueCount,
      today: todayDay,
    }),
    lastExam,
    inProgressExam,
    recentExercises,
    recentWriting,
    recentSpeaking,
    recentExams,
    activeMistakes,
    // Brand-new account: nothing done yet and not mid-exam.
    isNewUser: !firstActivity && !inProgressExam,
  };
}
