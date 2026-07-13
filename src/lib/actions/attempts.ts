"use server";

import { requireUser } from "../auth/session";
import { submitExerciseAttemptForUser, type GradedExercise } from "../services/attempts";

export type { GradedExercise } from "../services/attempts";

export async function submitExerciseAttempt(input: {
  requestId: string;
  kind: "reading" | "listening";
  refId: string;
  answers: Record<string, number>;
  durationSeconds: number;
}): Promise<GradedExercise> {
  const user = await requireUser();
  return submitExerciseAttemptForUser(user.id, input);
}
