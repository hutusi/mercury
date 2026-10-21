import { and, desc, eq } from "drizzle-orm";
import type { Track } from "../../content/types";
import { db } from "../db";
import { mockExamAttempts, mockExams, speakingSubmissions, writingSubmissions } from "../db/schema";
import { countActiveMistakes } from "../mistakes";
import { buildDailyPlan, type PlanItem } from "../plan-core";
import { calendarDay, learnerDayRange } from "../streak-core";
import { getContinueReading } from "./books";
import { listListeningExercises } from "./listening";
import { getLearnerProfile } from "./profile";
import { listReadingExercises } from "./reading";
import { listSpeakingPrompts } from "./speaking";
import { countDueReviewCards, getVocabCounts } from "./vocab";
import { listWritingPrompts } from "./writing";

/** Gather every plan-core input in one parallel round and build a fresh plan. */
export async function buildFreshPlan(
  userId: string,
  track: Track,
  timeZone: string,
  now: Date = new Date(),
): Promise<{ items: PlanItem[]; dailyMinutes: number }> {
  const generatedFor = calendarDay(now, timeZone);
  const planToday = new Date(`${generatedFor}T12:00:00.000Z`);
  const learnerDate = (date: Date | null | undefined) =>
    date ? new Date(`${calendarDay(date, timeZone)}T12:00:00.000Z`) : null;

  const [
    profile,
    vocab,
    dueReviewCount,
    activeMistakes,
    bookChapter,
    reading,
    listening,
    writing,
    speaking,
    exam,
    lastWriting,
    lastSpeaking,
    lastExam,
  ] = await Promise.all([
    getLearnerProfile(userId),
    // Personal collections are unfiltered (ADR 0029): the plan's review and
    // mistake items must count what the study queue and notebook actually
    // serve — a goal-track count would say "learn new words" while due
    // cross-pack reviews sit hidden. Content suggestions below stay
    // goal-filtered; null also matches the dashboard's calls, so the
    // cache() dedupe on countActiveMistakes actually hits.
    getVocabCounts(userId),
    countDueReviewCards(userId, learnerDayRange(generatedFor, timeZone).start),
    countActiveMistakes(userId, null),
    getContinueReading(userId),
    listReadingExercises(userId, track),
    listListeningExercises(userId, track),
    listWritingPrompts(userId, track),
    listSpeakingPrompts(userId, track),
    track === "business"
      ? Promise.resolve(null)
      : db.query.mockExams.findFirst({
          where: eq(mockExams.track, track as "toeic" | "ielts"),
          orderBy: mockExams.id,
          columns: { id: true },
        }),
    db.query.writingSubmissions.findFirst({
      where: eq(writingSubmissions.userId, userId),
      orderBy: desc(writingSubmissions.createdAt),
      columns: { createdAt: true },
    }),
    db.query.speakingSubmissions.findFirst({
      where: eq(speakingSubmissions.userId, userId),
      orderBy: desc(speakingSubmissions.createdAt),
      columns: { createdAt: true },
    }),
    db.query.mockExamAttempts.findFirst({
      where: and(eq(mockExamAttempts.userId, userId), eq(mockExamAttempts.status, "completed")),
      orderBy: desc(mockExamAttempts.completedAt),
      columns: { completedAt: true },
    }),
  ]);

  const nextWriting =
    writing.prompts.find((p) => !writing.submissionCountByPrompt.has(p.id)) ?? writing.prompts[0];
  const nextSpeaking =
    speaking.prompts.find((p) => !speaking.submissionCountByPrompt.has(p.id)) ??
    speaking.prompts[0];

  const items = buildDailyPlan({
    profile: profile
      ? {
          dailyMinutes: profile.dailyMinutes,
          examDate: profile.examDate,
          skillEstimates: profile.skillEstimates,
        }
      : null,
    track,
    dueCount: dueReviewCount,
    freshCount: vocab.freshCount,
    activeMistakes,
    recent: {
      lastWritingAt: learnerDate(lastWriting?.createdAt),
      lastSpeakingAt: learnerDate(lastSpeaking?.createdAt),
      lastExamAt: learnerDate(lastExam?.completedAt),
    },
    available: {
      reading: reading.exercises.map((e) => ({
        id: e.id,
        suggestedMinutes: e.suggestedMinutes,
        attempted: reading.bestByExercise.has(e.id),
      })),
      listening: listening.exercises.map((e) => ({
        id: e.id,
        attempted: listening.bestByExercise.has(e.id),
      })),
      writing: nextWriting
        ? { id: nextWriting.id, suggestedMinutes: nextWriting.suggestedMinutes }
        : null,
      speaking: nextSpeaking ? { id: nextSpeaking.id } : null,
      examId: exam?.id ?? null,
      bookChapter,
    },
    today: planToday,
  });

  return { items, dailyMinutes: profile?.dailyMinutes ?? 20 };
}
