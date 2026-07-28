import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { gradingInputHash } from "../ai-grading-core";
import { findCheckIn, gradeBookQuiz, type GradedBookQuiz } from "../book-core";
import { db } from "../db";
import { bookChapters, bookQuizAttempts } from "../db/schema";
import { isChapterUnlockedForUser } from "../queries/books";
import { recordActivityWith } from "../streak";
import { ConflictError, NotFoundError } from "./errors";
import { recordMistakeOutcomes } from "./mistake-state";
import { recordSkillSignalSafely } from "./profile";

export type { GradedBookQuiz } from "../book-core";

/**
 * Book mutations and the check-in reveal (ADR 0024). Check-ins are
 * stateless: the reveal returns the key for ONE check-in after the learner
 * has committed to an answer, and writes nothing — no mistakes, no skill
 * signal, no streak. The end-of-chapter quiz is the persisted event.
 */

export const SubmitBookQuizSchema = z.object({
  requestId: z.string().uuid(),
  chapterId: z.string(),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
  durationSeconds: z
    .number()
    .int()
    .nonnegative()
    .max(60 * 60 * 6),
});

/**
 * Grade the end-of-chapter recall quiz, persist the attempt, and hook the
 * learning loops: mistakes notebook (track NULL — books are track-agnostic),
 * streak, and the reading skill signal. Submitting completes the chapter and
 * unlocks the next one regardless of score (completion-gated, ADR 0024).
 */
export async function submitBookQuizForUser(
  userId: string,
  input: unknown,
): Promise<GradedBookQuiz> {
  const { requestId, chapterId, answers, durationSeconds } = SubmitBookQuizSchema.parse(input);

  const chapter = await db.query.bookChapters.findFirst({
    where: eq(bookChapters.id, chapterId),
  });
  if (!chapter) throw new NotFoundError(`Unknown book chapter: ${chapterId}`);

  if (!(await isChapterUnlockedForUser(userId, chapter))) {
    throw new ConflictError("Previous chapter quiz not submitted", "chapter_locked");
  }

  const graded = gradeBookQuiz(chapter.quiz, answers);
  // The graded input, minus incidental timing: a network retry sends the same
  // answers with a slightly larger durationSeconds and must stay idempotent.
  const inputHash = gradingInputHash({ kind: "book_quiz", chapterId, answers });

  const completedAt = new Date();
  const winner = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(bookQuizAttempts)
      .values({
        userId,
        bookId: chapter.bookId,
        chapterId,
        answers,
        score: graded.score,
        total: graded.total,
        durationSeconds,
        completedAt,
        requestId,
        inputHash,
      })
      .onConflictDoNothing({
        target: [bookQuizAttempts.userId, bookQuizAttempts.requestId],
        where: sql`${bookQuizAttempts.requestId} is not null`,
      })
      .returning({ id: bookQuizAttempts.id });

    if (!inserted) {
      // A row already exists for this (user, requestId). Same input →
      // idempotent replay (return the recomputed grade, no side effects);
      // different input → the id was reused, which is a conflict.
      const [prior] = await tx
        .select({ inputHash: bookQuizAttempts.inputHash })
        .from(bookQuizAttempts)
        .where(and(eq(bookQuizAttempts.userId, userId), eq(bookQuizAttempts.requestId, requestId)))
        .limit(1);
      if (!prior || prior.inputHash !== inputHash) {
        throw new ConflictError(
          "This request id was already used for a different attempt",
          "book_quiz_request_conflict",
        );
      }
      return false;
    }

    await recordMistakeOutcomes(tx, {
      userId,
      track: null,
      kind: "book_quiz",
      refId: chapterId,
      occurredAt: completedAt,
      outcomes: graded.perQuestion.map((question) => ({
        questionId: question.questionId,
        correct: question.correct,
      })),
    });
    await recordActivityWith(tx, userId);
    return true;
  });

  // Skill signal only for the winning insert, and only after it commits — a
  // replay must not re-apply it (the read model already reflects this attempt).
  if (winner && graded.total > 0) {
    await recordSkillSignalSafely(userId, {
      skill: "reading",
      value: (graded.score / graded.total) * 100,
      source: "exercise",
    });
  }

  return graded;
}

export const CheckInSchema = z.object({
  chapterId: z.string(),
  questionId: z.string(),
  chosenIndex: z.number().int().min(0).max(3),
});

export interface CheckInResult {
  correct: boolean;
  correctIndex: number;
  explanationZh: string;
}

export async function answerBookCheckInForUser(
  userId: string,
  input: unknown,
): Promise<CheckInResult> {
  const { chapterId, questionId, chosenIndex } = CheckInSchema.parse(input);

  const chapter = await db.query.bookChapters.findFirst({
    where: eq(bookChapters.id, chapterId),
  });
  if (!chapter) throw new NotFoundError(`Unknown book chapter: ${chapterId}`);

  // A locked chapter's content is never readable, so its keys are not either.
  if (!(await isChapterUnlockedForUser(userId, chapter))) {
    throw new ConflictError("Previous chapter quiz not submitted", "chapter_locked");
  }

  // findCheckIn matches check-ins only — quiz ids 404 here by design, so
  // this reveal can never leak end-of-chapter answers before submission.
  const question = findCheckIn(chapter.sections, questionId);
  if (!question) throw new NotFoundError(`Unknown check-in question: ${questionId}`);

  return {
    correct: chosenIndex === question.correctIndex,
    correctIndex: question.correctIndex,
    explanationZh: question.explanationZh,
  };
}
