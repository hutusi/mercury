import { eq } from "drizzle-orm";
import { z } from "zod";
import { findCheckIn } from "../book-core";
import { db } from "../db";
import { bookChapters } from "../db/schema";
import { isChapterUnlockedForUser } from "../queries/books";
import { ConflictError, NotFoundError } from "./errors";

/**
 * Book mutations and the check-in reveal (ADR 0024). Check-ins are
 * stateless: the reveal returns the key for ONE check-in after the learner
 * has committed to an answer, and writes nothing — no mistakes, no skill
 * signal, no streak. The end-of-chapter quiz is the persisted event.
 */

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
