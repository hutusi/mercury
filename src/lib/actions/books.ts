"use server";

import { requireUser } from "../auth/session";
import {
  answerBookCheckInForUser,
  submitBookQuizForUser,
  type CheckInResult,
  type GradedBookQuiz,
} from "../services/books";

export type { CheckInResult, GradedBookQuiz } from "../services/books";

export async function submitBookQuiz(input: {
  requestId: string;
  bookId: string;
  chapterId: string;
  answers: Record<string, number>;
  durationSeconds: number;
}): Promise<GradedBookQuiz> {
  const user = await requireUser();
  return submitBookQuizForUser(user.id, input);
}

export async function answerBookCheckIn(input: {
  bookId: string;
  chapterId: string;
  questionId: string;
  chosenIndex: number;
}): Promise<CheckInResult> {
  const user = await requireUser();
  return answerBookCheckInForUser(user.id, input);
}
