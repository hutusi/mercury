import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { activeAiModel, getSpeakingFeedback } from "../ai/client";
import type { SpeakingFeedback } from "../ai/schemas";
import { db } from "../db";
import { speakingPrompts, speakingSubmissions } from "../db/schema";
import { recordActivity } from "../streak";
import { NotFoundError } from "./errors";

export const SubmitSpeakingSchema = z.object({
  promptId: z.string(),
  transcript: z.string().min(10).max(20000),
  durationSeconds: z.number().int().nonnegative().max(600),
});

export interface SpeakingResult {
  submissionId: string;
  status: "ai_scored" | "self_assessed";
  feedback: SpeakingFeedback | null;
}

/** AI-grade a spoken transcript; on any AI failure degrade to self-assessment. */
export async function submitSpeakingForUser(
  userId: string,
  input: unknown,
): Promise<SpeakingResult> {
  const { promptId, transcript, durationSeconds } = SubmitSpeakingSchema.parse(input);

  const prompt = await db.query.speakingPrompts.findFirst({
    where: eq(speakingPrompts.id, promptId),
  });
  if (!prompt) throw new NotFoundError(`Unknown speaking prompt: ${promptId}`);

  let feedback: SpeakingFeedback | null = null;
  let status: "ai_scored" | "self_assessed" = "self_assessed";
  try {
    feedback = await getSpeakingFeedback({
      partType: prompt.partType,
      promptEn: prompt.promptEn,
      transcript,
      durationSeconds,
    });
    status = "ai_scored";
  } catch {
    feedback = null;
    status = "self_assessed";
  }

  const [submission] = await db
    .insert(speakingSubmissions)
    .values({
      userId,
      promptId,
      transcript,
      durationSeconds,
      status,
      feedback,
      model: status === "ai_scored" ? activeAiModel() : null,
    })
    .returning({ id: speakingSubmissions.id });

  await recordActivity(userId);
  return { submissionId: submission.id, status, feedback };
}

/**
 * Re-grade a submission that landed in self-assessment mode after a transient
 * AI failure. Returns the refreshed result so the caller can swap in the AI
 * panel in place; throws AiUnavailableError if grading fails again.
 */
export async function retrySpeakingFeedbackForUser(
  userId: string,
  submissionId: string,
): Promise<SpeakingResult> {
  const submission = await db.query.speakingSubmissions.findFirst({
    where: and(eq(speakingSubmissions.id, submissionId), eq(speakingSubmissions.userId, userId)),
  });
  if (!submission) throw new NotFoundError("Submission not found");
  if (submission.status === "ai_scored") {
    return { submissionId: submission.id, status: "ai_scored", feedback: submission.feedback };
  }

  const prompt = await db.query.speakingPrompts.findFirst({
    where: eq(speakingPrompts.id, submission.promptId),
  });
  if (!prompt) throw new NotFoundError(`Unknown speaking prompt: ${submission.promptId}`);

  const feedback = await getSpeakingFeedback({
    partType: prompt.partType,
    promptEn: prompt.promptEn,
    transcript: submission.transcript,
    durationSeconds: submission.durationSeconds,
  });

  // Compare-and-set on status so a concurrent retry can't overwrite this one.
  const [updated] = await db
    .update(speakingSubmissions)
    .set({
      status: "ai_scored",
      feedback,
      model: activeAiModel(),
    })
    .where(
      and(
        eq(speakingSubmissions.id, submission.id),
        eq(speakingSubmissions.status, "self_assessed"),
      ),
    )
    .returning();

  if (updated) return { submissionId: submission.id, status: "ai_scored", feedback };

  // Lost the race: a concurrent retry already scored this submission. Return
  // the persisted feedback (status is necessarily ai_scored now) so the UI
  // can't show a result that never reached the database.
  const stored = await db.query.speakingSubmissions.findFirst({
    where: and(eq(speakingSubmissions.id, submission.id), eq(speakingSubmissions.userId, userId)),
  });
  return {
    submissionId: submission.id,
    status: "ai_scored",
    feedback: stored?.feedback ?? feedback,
  };
}
