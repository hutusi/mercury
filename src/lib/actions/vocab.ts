"use server";

import { requireUser } from "../auth/session";
import { answerQuizSessionForUser } from "../services/vocab-quiz";
import { gradeCardForUser } from "../services/vocab";
import type { ReviewGrade } from "../srs";

export async function gradeCard(input: {
  wordId: string;
  grade: ReviewGrade;
}): Promise<{ intervalDays: number }> {
  const user = await requireUser();
  return gradeCardForUser(user.id, input);
}

export async function answerQuiz(input: {
  sessionId: string;
  questionId: string;
  optionId: string;
}) {
  const user = await requireUser();
  return answerQuizSessionForUser(user.id, input);
}
