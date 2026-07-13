import { and, desc, eq, lte, sql } from "drizzle-orm";
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

/** Everything the dashboard shows, in one round of parallel queries. */
export async function getDashboardData(userId: string, track: Track) {
  const today = new Date();
  const timeZone = await getUserTimeZone(userId);
  const todayDay = calendarDay(today, timeZone);

  const [
    streak,
    dueRows,
    inProgressExam,
    recentExercises,
    recentWriting,
    recentSpeaking,
    recentExams,
    latestActivity,
    activeMistakes,
  ] = await Promise.all([
    getStreak(userId, timeZone),
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
      where: and(eq(mockExamAttempts.userId, userId), eq(mockExamAttempts.status, "in_progress")),
      orderBy: desc(mockExamAttempts.startedAt),
      columns: { examId: true },
    }),
    db.query.exerciseAttempts.findMany({
      where: eq(exerciseAttempts.userId, userId),
      orderBy: desc(exerciseAttempts.completedAt),
      limit: 5,
      columns: { kind: true, score: true, total: true, completedAt: true },
    }),
    db.query.writingSubmissions.findMany({
      where: and(eq(writingSubmissions.userId, userId), eq(writingSubmissions.status, "ai_scored")),
      orderBy: desc(writingSubmissions.createdAt),
      limit: 5,
      columns: { feedback: true, createdAt: true },
    }),
    db.query.speakingSubmissions.findMany({
      where: and(
        eq(speakingSubmissions.userId, userId),
        eq(speakingSubmissions.status, "ai_scored"),
      ),
      orderBy: desc(speakingSubmissions.createdAt),
      limit: 5,
      columns: { feedback: true, createdAt: true },
    }),
    db.query.mockExamAttempts.findMany({
      where: and(eq(mockExamAttempts.userId, userId), eq(mockExamAttempts.status, "completed")),
      orderBy: desc(mockExamAttempts.completedAt),
      limit: 5,
      columns: { startedAt: true, completedAt: true, estimate: true },
    }),
    // The latest day proves whether any activity exists and is all reminderState needs.
    db.query.activityDays.findFirst({
      where: eq(activityDays.userId, userId),
      orderBy: desc(activityDays.day),
      columns: { day: true },
    }),
    countActiveMistakes(userId, track),
  ]);

  const dueCount = dueRows[0]?.count ?? 0;
  const lastExam = recentExams[0] ?? null;

  return {
    streak,
    dueCount,
    reminder: reminderState({
      days: new Set(latestActivity ? [latestActivity.day] : []),
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
    isNewUser: !latestActivity && !inProgressExam,
  };
}
