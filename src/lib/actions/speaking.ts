"use server";

import { requireUser } from "../auth/session";
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
): Promise<SpeakingResult> {
  const user = await requireUser();
  return retrySpeakingFeedbackForUser(user.id, submissionId, { requestId });
}
