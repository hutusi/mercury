"use server";

import { requireUser } from "../auth/session";
import { answerBookCheckInForUser, type CheckInResult } from "../services/books";

export type { CheckInResult } from "../services/books";

export async function answerBookCheckIn(input: {
  chapterId: string;
  questionId: string;
  chosenIndex: number;
}): Promise<CheckInResult> {
  const user = await requireUser();
  return answerBookCheckInForUser(user.id, input);
}
