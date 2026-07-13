"use server";

import { requireUser } from "../auth/session";
import { ExpiredError } from "../services/errors";
import { retestMistakeForUser, type RetestResult } from "../services/mistakes";
import {
  answerQuizSessionForUser,
  createVocabMistakeSessionForUser,
  type QuizAnswerResult,
} from "../services/vocab-quiz";

export type { RetestResult } from "../services/mistakes";

/**
 * Typed so the notebook can react to a no-longer-valid session (production Next
 * masks server-action error messages): a stale generation or an expired session
 * means "discard this retest and start a fresh one", not a generic failure.
 */
export type VocabMistakeRetestAnswer =
  { ok: true; result: QuizAnswerResult } | { ok: false; reason: "stale" };

export async function retestMistake(input: {
  kind: "reading" | "listening" | "exam";
  refId: string;
  questionId: string;
  chosenIndex: number;
}): Promise<RetestResult> {
  const user = await requireUser();
  return retestMistakeForUser(user.id, input);
}

export async function createVocabMistakeRetest(wordId: string) {
  const user = await requireUser();
  return createVocabMistakeSessionForUser(user.id, wordId);
}

export async function answerVocabMistakeRetest(input: {
  sessionId: string;
  questionId: string;
  optionId: string;
}): Promise<VocabMistakeRetestAnswer> {
  const user = await requireUser();
  try {
    const result = await answerQuizSessionForUser(user.id, input);
    return { ok: true, result };
  } catch (error) {
    // 410s: the mistake generation moved on, or the 30-minute session lapsed.
    // Both are resolved the same way — drop the session and offer a fresh retest.
    if (
      error instanceof ExpiredError &&
      (error.code === "mistake_session_stale" || error.code === "quiz_session_expired")
    ) {
      return { ok: false, reason: "stale" };
    }
    throw error;
  }
}
