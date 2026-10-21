"use server";

import { requireUser } from "../auth/session";
import { ConflictError, LimitExceededError } from "../services/errors";
import { retryWritingFeedbackForUser, submitWritingForUser } from "../services/writing";

/**
 * The same request id is still being graded by another call (a lost-response
 * resubmit, a double tap, a reload) — or that call lost its lease to a
 * reclaim that will publish. Either way, asking again with the same id later
 * returns the finished result. Server-action errors are masked in prod, so
 * this must be a typed result, not a throw the client can't tell apart.
 */
function isInProgress(err: unknown): boolean {
  return (
    err instanceof ConflictError &&
    (err.code === "grading_in_progress" || err.code === "grading_claim_superseded")
  );
}

export async function submitWriting(input: {
  requestId: string;
  promptId: string;
  text: string;
}): Promise<
  { ok: true; submissionId: string; degradeReason?: "quota" } | { ok: false; reason: "in_progress" }
> {
  const user = await requireUser();
  try {
    const { submissionId, degradeReason } = await submitWritingForUser(user.id, input);
    return { ok: true, submissionId, degradeReason };
  } catch (err) {
    if (isInProgress(err)) return { ok: false, reason: "in_progress" };
    throw err;
  }
}

export async function retryWritingFeedback(
  submissionId: string,
  requestId: string,
): Promise<{ scored: boolean; limited?: boolean; inProgress?: boolean }> {
  const user = await requireUser();
  // The web component refreshes the page after a retry, so it only needs the
  // booleans; the API route returns the service's full result directly.
  // Typed return instead of a throw: server-action errors are masked in prod.
  try {
    const result = await retryWritingFeedbackForUser(user.id, submissionId, { requestId });
    return { scored: result.status === "ai_scored" };
  } catch (err) {
    if (err instanceof LimitExceededError) return { scored: false, limited: true };
    if (isInProgress(err)) return { scored: false, inProgress: true };
    throw err;
  }
}
