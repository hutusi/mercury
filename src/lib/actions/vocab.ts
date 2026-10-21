"use server";

import { requireUser } from "../auth/session";
import { ConflictError, ExpiredError, NotFoundError } from "../services/errors";
import { answerQuizSessionForUser, type QuizAnswerResult } from "../services/vocab-quiz";
import {
  gradeCardForUser,
  undoGradeForUser,
  type GradeCardResult,
  type UndoGradeResult,
} from "../services/vocab";
import type { ReviewGrade } from "../srs";

export async function gradeCard(input: {
  wordId: string;
  grade: ReviewGrade;
  requestId: string;
}): Promise<({ ok: true } & GradeCardResult) | { ok: false; reason: "conflict" }> {
  const user = await requireUser();
  // Typed "conflict" (a request id reused for another word) instead of a
  // throw: server-action errors are masked in prod and would read as a
  // network failure the learner could only retry into the same conflict.
  try {
    return { ok: true, ...(await gradeCardForUser(user.id, input)) };
  } catch (err) {
    if (err instanceof ConflictError) return { ok: false, reason: "conflict" };
    throw err;
  }
}

/**
 * Undo the last grade. Typed failures: "gone" — the review was already undone
 * (a retried request) or never existed; "stale" — expired, superseded, or a
 * legacy row. Either way the client simply keeps its current state.
 */
export async function undoGrade(input: {
  reviewId: string;
}): Promise<({ ok: true } & UndoGradeResult) | { ok: false; reason: "gone" | "stale" }> {
  const user = await requireUser();
  try {
    return { ok: true, ...(await undoGradeForUser(user.id, input)) };
  } catch (err) {
    if (err instanceof NotFoundError) return { ok: false, reason: "gone" };
    if (err instanceof ConflictError || err instanceof ExpiredError) {
      return { ok: false, reason: "stale" };
    }
    throw err;
  }
}

export async function answerQuiz(input: {
  sessionId: string;
  questionId: string;
  optionId: string;
}): Promise<({ ok: true } & QuizAnswerResult) | { ok: false; reason: "conflict" | "expired" }> {
  const user = await requireUser();
  // Typed returns instead of throws (server-action errors are masked in
  // prod): "conflict" = this question already holds a different answer
  // (a lost response was retried with another option); "expired" = the
  // 30-minute session TTL lapsed. Both used to render as a network error
  // with no way forward.
  try {
    const result = await answerQuizSessionForUser(user.id, input);
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof ConflictError) return { ok: false, reason: "conflict" };
    if (err instanceof ExpiredError) return { ok: false, reason: "expired" };
    throw err;
  }
}
