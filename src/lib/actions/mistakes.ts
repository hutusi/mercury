"use server";

import { requireUser } from "../auth/session";
import {
  retestMistakeForUser,
  retestVocabMistakeForUser,
  type RetestResult,
} from "../services/mistakes";

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

export async function retestVocabMistake(input: {
  wordId: string;
  chosenWordId: string;
}): Promise<{ correct: boolean }> {
  const user = await requireUser();
  return retestVocabMistakeForUser(user.id, input);
}
