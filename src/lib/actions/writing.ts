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
  return retryWritingFeedbackForUser(user.id, submissionId);
}
