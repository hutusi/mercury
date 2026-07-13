"use server";

import { requireUser } from "../auth/session";
import { upsertLearnerProfileForUser } from "../services/profile";

/** Update learning goals (target score, exam date, daily minutes, self-rating). */
export async function updateLearnerProfile(input: unknown) {
  const user = await requireUser();
  await upsertLearnerProfileForUser(user.id, input);
}
