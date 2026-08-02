"use server";

import { requireUser } from "../auth/session";
import { LimitExceededError } from "../services/errors";
import {
  retrySpeakingFeedbackForUser,
  submitSpeakingForUser,
  type SpeakingResult,
} from "../services/speaking";

export type { SpeakingResult } from "../services/speaking";

export async function submitSpeaking(input: {
  requestId: string;
  promptId: string;
  transcript: string;
  durationSeconds: number;
}): Promise<SpeakingResult> {
  const user = await requireUser();
  return submitSpeakingForUser(user.id, input);
}

export async function retrySpeakingFeedback(
  submissionId: string,
  requestId: string,
): Promise<SpeakingResult | { limited: true }> {
  const user = await requireUser();
  // Typed return instead of a throw: server-action errors are masked in prod.
  try {
    return await retrySpeakingFeedbackForUser(user.id, submissionId, { requestId });
  } catch (err) {
    if (err instanceof LimitExceededError) return { limited: true };
    throw err;
  }
}
