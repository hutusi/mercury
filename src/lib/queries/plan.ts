import { and, desc, eq } from "drizzle-orm";
import type { Track } from "../../content/types";
import { db } from "../db";
import { mockExamAttempts, mockExams, speakingSubmissions, writingSubmissions } from "../db/schema";
import { countActiveMistakes } from "../mistakes";
import { buildDailyPlan, type PlanItem } from "../plan-core";
import { localDay } from "../streak-core";
import { getLearnerProfile } from "./profile";
import { listListeningExercises } from "./listening";
import { listReadingExercises } from "./reading";
import { listSpeakingPrompts } from "./speaking";
import { getVocabOverview } from "./vocab";
import { listWritingPrompts } from "./writing";

export interface DailyPlan {
  items: PlanItem[];
  dailyMinutes: number;
  /** Local day the plan was computed for (YYYY-MM-DD). */
  generatedFor: string;
}

/** Gather every plan-core input in one parallel round and build 今日计划. */
export async function getDailyPlan(userId: string, track: Track): Promise<DailyPlan> {
  const today = new Date();

  const [
    profile,
    vocab,
    activeMistakes,
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
    getVocabOverview(userId, track),
    countActiveMistakes(userId, track),
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
          goalTrack: profile.goalTrack,
          skillEstimates: profile.skillEstimates,
        }
      : null,
    activeTrack: track,
    dueCount: vocab.dueCount,
    freshCount: vocab.freshCount,
    activeMistakes,
    recent: {
      lastWritingAt: lastWriting?.createdAt ?? null,
      lastSpeakingAt: lastSpeaking?.createdAt ?? null,
      lastExamAt: lastExam?.completedAt ?? null,
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
    },
    today,
  });

  return {
    items,
    dailyMinutes: profile?.dailyMinutes ?? 20,
    generatedFor: localDay(today),
  };
}
