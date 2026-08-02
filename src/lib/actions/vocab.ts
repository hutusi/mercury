"use server";

import { requireUser } from "../auth/session";
import { ConflictError, ExpiredError } from "../services/errors";
import { answerQuizSessionForUser, type QuizAnswerResult } from "../services/vocab-quiz";
import { gradeCardForUser } from "../services/vocab";
import type { ReviewGrade, SrsState } from "../srs";

export async function gradeCard(input: {
  wordId: string;
  grade: ReviewGrade;
}): Promise<{ intervalDays: number; srs: SrsState }> {
  const user = await requireUser();
  return gradeCardForUser(user.id, input);
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
