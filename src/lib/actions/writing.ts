"use server";

import { requireUser } from "../auth/session";
import { LimitExceededError } from "../services/errors";
import { retryWritingFeedbackForUser, submitWritingForUser } from "../services/writing";

export async function submitWriting(input: {
  requestId: string;
  promptId: string;
  text: string;
}): Promise<{ submissionId: string; degradeReason?: "quota" }> {
  const user = await requireUser();
  const { submissionId, degradeReason } = await submitWritingForUser(user.id, input);
  return { submissionId, degradeReason };
}

export async function retryWritingFeedback(
  submissionId: string,
  requestId: string,
): Promise<{ scored: boolean; limited?: boolean }> {
  const user = await requireUser();
  // The web component refreshes the page after a retry, so it only needs the
  // booleans; the API route returns the service's full result directly.
  // Typed return instead of a throw: server-action errors are masked in prod.
  try {
    const result = await retryWritingFeedbackForUser(user.id, submissionId, { requestId });
    return { scored: result.status === "ai_scored" };
  } catch (err) {
    if (err instanceof LimitExceededError) return { scored: false, limited: true };
    throw err;
  }
}
