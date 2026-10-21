import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { ExamTrack, Track } from "../../content/types";
import { db } from "../db";
import { bookChapters, books, mockExamAttempts, mockExams, type ExamEstimate } from "../db/schema";
import type { SkillEstimates, SkillKey } from "../learner-model-core";
import { practiceOrder } from "../plan-core";
import { getContinueReading } from "./books";
import { listListeningExercises } from "./listening";
import { getLearnerProfile } from "./profile";
import { listReadingExercises } from "./reading";
import { listSpeakingPrompts } from "./speaking";
import { getVocabCounts } from "./vocab";
import { listWritingPrompts } from "./writing";

export interface PracticeExam {
  id: string;
  title: string;
  titleZh: string;
  track: ExamTrack;
  totalQuestions: number;
  minutes: number;
  inProgress: boolean;
  lastEstimate: ExamEstimate | null;
}

export interface PracticeOverview {
  skillEstimates: SkillEstimates | null;
  /** Weakest measured skill; null while every skill is an unrated seed. */
  weakestSkill: SkillKey | null;
  targetScore: number | null;
  vocab: { due: number; learned: number };
  reading: { done: number; total: number };
  listening: { done: number; total: number };
  writing: { submitted: number };
  speaking: { submitted: number };
  book: { bookId: string; title: string; chapter: number } | null;
  exam: PracticeExam | null;
}

/**
 * The Practice hub: one card per skill with the learner model's estimate and
 * a progress line, plus the mock exam. Content counts follow the goal track
 * (ADR 0020). Business learners get the TOEIC mini exam as their benchmark.
 */
export async function getPracticeOverview(
  userId: string,
  goalTrack: Track,
): Promise<PracticeOverview> {
  const examTrack: ExamTrack = goalTrack === "business" ? "toeic" : goalTrack;
  const [profile, vocab, reading, listening, writing, speaking, continueReading, exam] =
    await Promise.all([
      getLearnerProfile(userId),
      getVocabCounts(userId),
      listReadingExercises(userId, goalTrack),
      listListeningExercises(userId, goalTrack),
      listWritingPrompts(userId, goalTrack),
      listSpeakingPrompts(userId, goalTrack),
      getContinueReading(userId),
      getPracticeExam(userId, examTrack),
    ]);

  const estimates = profile?.skillEstimates ?? null;
  const measured = estimates && Object.values(estimates).some((e) => e.confidence !== "low");
  const sum = (counts: Map<string, number>) => [...counts.values()].reduce((a, b) => a + b, 0);

  let book: PracticeOverview["book"] = null;
  if (continueReading) {
    const [row] = await db
      .select({ title: books.title, chapter: bookChapters.sortOrder })
      .from(bookChapters)
      .innerJoin(books, eq(books.id, bookChapters.bookId))
      .where(
        and(
          eq(bookChapters.bookId, continueReading.bookId),
          eq(bookChapters.id, continueReading.chapterId),
        ),
      )
      .limit(1);
    if (row) book = { bookId: continueReading.bookId, title: row.title, chapter: row.chapter };
  }

  return {
    skillEstimates: estimates,
    weakestSkill: measured ? practiceOrder(estimates)[0] : null,
    targetScore: profile?.targetScore ?? null,
    vocab: { due: vocab.dueCount, learned: vocab.learnedCount },
    reading: { done: reading.bestByExercise.size, total: reading.exercises.length },
    listening: { done: listening.bestByExercise.size, total: listening.exercises.length },
    writing: { submitted: sum(writing.submissionCountByPrompt) },
    speaking: { submitted: sum(speaking.submissionCountByPrompt) },
    book,
    exam,
  };
}

/** The track's first (mini) exam with the learner's latest estimate on that track. */
async function getPracticeExam(userId: string, track: ExamTrack): Promise<PracticeExam | null> {
  const [exam] = await db
    .select({
      id: mockExams.id,
      title: mockExams.title,
      titleZh: mockExams.titleZh,
      totalQuestions: mockExams.totalQuestions,
      // Section timings only — the sections' answer keys never leave Postgres.
      seconds: sql<number>`(select coalesce(sum((s->>'durationSeconds')::int), 0) from jsonb_array_elements(${mockExams.sections}) s)`,
    })
    .from(mockExams)
    .where(eq(mockExams.track, track))
    .orderBy(asc(mockExams.id))
    .limit(1);
  if (!exam) return null;

  const [inProgress, last] = await Promise.all([
    db
      .select({ id: mockExamAttempts.id })
      .from(mockExamAttempts)
      .where(
        and(
          eq(mockExamAttempts.userId, userId),
          eq(mockExamAttempts.examId, exam.id),
          eq(mockExamAttempts.status, "in_progress"),
        ),
      )
      .limit(1),
    db
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
      .limit(1),
  ]);

  return {
    id: exam.id,
    title: exam.title,
    titleZh: exam.titleZh,
    track,
    totalQuestions: exam.totalQuestions,
    minutes: Math.max(1, Math.round(Number(exam.seconds) / 60)),
    inProgress: inProgress.length > 0,
    lastEstimate: last[0]?.estimate ?? null,
  };
}
