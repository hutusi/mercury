import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  bookQuizAttempts,
  exerciseAttempts,
  mistakeStates,
  mockExamAttempts,
  reviewLogs,
  speakingSubmissions,
  srsCards,
  writingSubmissions,
} from "../db/schema";
import type { PlanItem } from "../plan-core";
import { EMPTY_FACTS, factNeeds, type PlanFacts } from "../plan-status-core";

/**
 * The learner-day's facts a plan's stops are judged against (ADR 0033). Only
 * the queries the plan's kinds need run, all in one parallel wave, each on an
 * index that starts with user_id. The day is a half-open UTC range from
 * learnerDayRange().
 */
export async function getPlanFacts(
  userId: string,
  items: readonly PlanItem[],
  { start, end }: { start: Date; end: Date },
): Promise<PlanFacts> {
  const needs = factNeeds(items);
  const none = Promise.resolve(null);

  const [vocab, mistakes, exercises, writing, speaking, books, exams] = await Promise.all([
    needs.vocab
      ? db
          .select({
            existing: sql<number>`count(distinct ${reviewLogs.cardId}) filter (where ${srsCards.createdAt} < ${start})`,
            created: sql<number>`count(distinct ${reviewLogs.cardId}) filter (where ${srsCards.createdAt} >= ${start})`,
          })
          .from(reviewLogs)
          .innerJoin(srsCards, eq(srsCards.id, reviewLogs.cardId))
          .where(
            and(
              eq(reviewLogs.userId, userId),
              gte(reviewLogs.reviewedAt, start),
              lt(reviewLogs.reviewedAt, end),
            ),
          )
      : none,
    needs.mistakes
      ? db
          .select({ cleared: sql<number>`count(*)` })
          .from(mistakeStates)
          .where(
            and(
              eq(mistakeStates.userId, userId),
              sql`${mistakeStates.wrongCount} > 0`,
              gte(mistakeStates.clearedAt, start),
              lt(mistakeStates.clearedAt, end),
              // A clear later revived by a fresh mistake no longer counts.
              sql`${mistakeStates.clearedAt} >= ${mistakeStates.lastWrongAt}`,
            ),
          )
      : none,
    needs.exercises.length
      ? db
          .selectDistinctOn([exerciseAttempts.kind, exerciseAttempts.refId], {
            kind: exerciseAttempts.kind,
            refId: exerciseAttempts.refId,
            score: exerciseAttempts.score,
            total: exerciseAttempts.total,
          })
          .from(exerciseAttempts)
          .where(
            and(
              eq(exerciseAttempts.userId, userId),
              inArray(
                exerciseAttempts.refId,
                needs.exercises.map((e) => e.refId),
              ),
              gte(exerciseAttempts.completedAt, start),
              lt(exerciseAttempts.completedAt, end),
            ),
          )
          .orderBy(
            exerciseAttempts.kind,
            exerciseAttempts.refId,
            desc(exerciseAttempts.completedAt),
          )
      : none,
    needs.writing.length
      ? db
          .selectDistinct({ promptId: writingSubmissions.promptId })
          .from(writingSubmissions)
          .where(
            and(
              eq(writingSubmissions.userId, userId),
              inArray(writingSubmissions.promptId, needs.writing),
              gte(writingSubmissions.createdAt, start),
              lt(writingSubmissions.createdAt, end),
            ),
          )
      : none,
    needs.speaking.length
      ? db
          .selectDistinct({ promptId: speakingSubmissions.promptId })
          .from(speakingSubmissions)
          .where(
            and(
              eq(speakingSubmissions.userId, userId),
              inArray(speakingSubmissions.promptId, needs.speaking),
              gte(speakingSubmissions.createdAt, start),
              lt(speakingSubmissions.createdAt, end),
            ),
          )
      : none,
    needs.books.length
      ? db
          .selectDistinctOn([bookQuizAttempts.chapterId], {
            chapterId: bookQuizAttempts.chapterId,
            score: bookQuizAttempts.score,
            total: bookQuizAttempts.total,
          })
          .from(bookQuizAttempts)
          .where(
            and(
              eq(bookQuizAttempts.userId, userId),
              or(
                ...needs.books.map((b) =>
                  and(
                    eq(bookQuizAttempts.bookId, b.bookId),
                    eq(bookQuizAttempts.chapterId, b.chapterId),
                  ),
                ),
              ),
              gte(bookQuizAttempts.completedAt, start),
              lt(bookQuizAttempts.completedAt, end),
            ),
          )
          .orderBy(bookQuizAttempts.chapterId, desc(bookQuizAttempts.completedAt))
      : none,
    needs.exams.length
      ? db
          .select({
            examId: mockExamAttempts.examId,
            status: mockExamAttempts.status,
            section: mockExamAttempts.currentSectionIndex,
            sections: sql<number>`jsonb_array_length(${mockExamAttempts.sectionsSnapshot})`,
            startedAt: mockExamAttempts.startedAt,
          })
          .from(mockExamAttempts)
          .where(
            and(
              eq(mockExamAttempts.userId, userId),
              inArray(mockExamAttempts.examId, needs.exams),
              or(
                eq(mockExamAttempts.status, "in_progress"),
                and(
                  eq(mockExamAttempts.status, "completed"),
                  gte(mockExamAttempts.completedAt, start),
                  lt(mockExamAttempts.completedAt, end),
                ),
              ),
            ),
          )
          .orderBy(desc(mockExamAttempts.startedAt))
      : none,
  ]);

  const examFacts: PlanFacts["exams"] extends ReadonlyMap<string, infer V>
    ? Map<string, V>
    : never = new Map();
  for (const row of exams ?? []) {
    const current = examFacts.get(row.examId);
    // A completion today wins over a newer in-progress retake.
    if (current?.status === "completed") continue;
    if (row.status === "completed") {
      examFacts.set(row.examId, {
        status: "completed",
        section: 0,
        sections: Number(row.sections),
      });
    } else if (row.status === "in_progress" && !current) {
      examFacts.set(row.examId, {
        status: "in_progress",
        section: row.section,
        sections: Number(row.sections),
      });
    }
  }

  return {
    ...EMPTY_FACTS,
    vocabReviewedExisting: Number(vocab?.[0]?.existing ?? 0),
    vocabReviewedNew: Number(vocab?.[0]?.created ?? 0),
    mistakesClearedToday: Number(mistakes?.[0]?.cleared ?? 0),
    exercises: new Map(
      (exercises ?? [])
        .filter((e) => needs.exercises.some((n) => n.kind === e.kind && n.refId === e.refId))
        .map((e) => [`${e.kind}:${e.refId}`, { score: e.score, total: e.total }]),
    ),
    writingSubmitted: new Set((writing ?? []).map((w) => w.promptId)),
    speakingSubmitted: new Set((speaking ?? []).map((s) => s.promptId)),
    bookQuizzes: new Map(
      (books ?? []).map((b) => [b.chapterId, { score: b.score, total: b.total }]),
    ),
    exams: examFacts,
  };
}
