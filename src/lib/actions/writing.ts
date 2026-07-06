"use server";

import { requireUser } from "../auth/session";
import { retryWritingFeedbackForUser, submitWritingForUser } from "../services/writing";

export async function submitWriting(input: {
  promptId: string;
  text: string;
}): Promise<{ submissionId: string }> {
  const user = await requireUser();
  const { submissionId } = await submitWritingForUser(user.id, input);
  return { submissionId };
}

export async function retryWritingFeedback(submissionId: string): Promise<{ scored: boolean }> {
  const user = await requireUser();
  // The web component refreshes the page after a retry, so it only needs the
  // boolean; the API route returns the service's full result directly.
  const result = await retryWritingFeedbackForUser(user.id, submissionId);
  return { scored: result.status === "ai_scored" };
}
