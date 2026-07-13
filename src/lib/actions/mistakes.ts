"use server";

import { requireUser } from "../auth/session";
import { retestMistakeForUser, type RetestResult } from "../services/mistakes";
import { answerQuizSessionForUser, createVocabMistakeSessionForUser } from "../services/vocab-quiz";

export type { RetestResult } from "../services/mistakes";

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
}) {
  const user = await requireUser();
  return answerQuizSessionForUser(user.id, input);
}
