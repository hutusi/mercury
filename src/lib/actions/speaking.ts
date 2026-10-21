"use server";

import { requireUser } from "../auth/session";
import { ConflictError, LimitExceededError } from "../services/errors";
import {
  retrySpeakingFeedbackForUser,
  submitSpeakingForUser,
  type SpeakingResult,
} from "../services/speaking";

export type { SpeakingResult } from "../services/speaking";

/** Another call still owns this request id's grading — see actions/writing.ts. */
function isInProgress(err: unknown): boolean {
  return (
    err instanceof ConflictError &&
    (err.code === "grading_in_progress" || err.code === "grading_claim_superseded")
  );
}

export async function submitSpeaking(input: {
  requestId: string;
  promptId: string;
  transcript: string;
  durationSeconds: number;
}): Promise<({ ok: true } & SpeakingResult) | { ok: false; reason: "in_progress" }> {
  const user = await requireUser();
  try {
    return { ok: true, ...(await submitSpeakingForUser(user.id, input)) };
  } catch (err) {
    if (isInProgress(err)) return { ok: false, reason: "in_progress" };
    throw err;
  }
}

export async function retrySpeakingFeedback(
  submissionId: string,
  requestId: string,
): Promise<SpeakingResult | { limited: true } | { inProgress: true }> {
  const user = await requireUser();
  // Typed return instead of a throw: server-action errors are masked in prod.
  try {
    return await retrySpeakingFeedbackForUser(user.id, submissionId, { requestId });
  } catch (err) {
    if (err instanceof LimitExceededError) return { limited: true };
    if (isInProgress(err)) return { inProgress: true };
    throw err;
  }
}
