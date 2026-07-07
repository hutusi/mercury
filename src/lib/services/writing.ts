import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getWritingFeedback } from "../ai/client";
import type { WritingFeedback } from "../ai/schemas";
import { db } from "../db";
import { writingPrompts, writingSubmissions } from "../db/schema";
import { recordActivity } from "../streak";
import { NotFoundError } from "./errors";

export const SubmitWritingSchema = z.object({
  promptId: z.string(),
  text: z.string().min(20).max(30000),
});

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface WritingResult {
  submissionId: string;
  status: "ai_scored" | "self_assessed";
  feedback: WritingFeedback | null;
}

/** AI-grade an essay; on any AI failure degrade to self-assessment. */
export async function submitWritingForUser(userId: string, input: unknown): Promise<WritingResult> {
  const { promptId, text } = SubmitWritingSchema.parse(input);

  const prompt = await db.query.writingPrompts.findFirst({
    where: eq(writingPrompts.id, promptId),
  });
  if (!prompt) throw new NotFoundError(`Unknown writing prompt: ${promptId}`);

  const wordCount = countWords(text);

  let feedback: WritingFeedback | null = null;
  let status: "ai_scored" | "self_assessed" = "self_assessed";
  try {
    feedback = await getWritingFeedback({
      taskType: prompt.taskType,
      promptEn: prompt.promptEn,
      userText: text,
      wordCount,
    });
    status = "ai_scored";
  } catch {
    // No key, API error, refusal, or schema mismatch — degrade to self-assessment.
    feedback = null;
    status = "self_assessed";
  }

  const [submission] = await db
    .insert(writingSubmissions)
    .values({
      userId,
      promptId,
      text,
      wordCount,
      status,
      feedback,
      model: status === "ai_scored" ? process.env.MERCURY_AI_MODEL || "claude-sonnet-5" : null,
    })
    .returning({ id: writingSubmissions.id });

  await recordActivity(userId);
  return { submissionId: submission.id, status, feedback };
}

/**
 * Re-grade a submission that landed in self-assessment mode after a transient
 * AI failure. Returns the refreshed result (same contract as speaking) so the
 * caller can swap in the AI panel without a follow-up read; throws
 * AiUnavailableError if grading fails again.
 */
export async function retryWritingFeedbackForUser(
  userId: string,
  submissionId: string,
): Promise<WritingResult> {
  const submission = await db.query.writingSubmissions.findFirst({
    where: and(eq(writingSubmissions.id, submissionId), eq(writingSubmissions.userId, userId)),
  });
  if (!submission) throw new NotFoundError("Submission not found");
  if (submission.status === "ai_scored") {
    return { submissionId: submission.id, status: "ai_scored", feedback: submission.feedback };
  }

  const prompt = await db.query.writingPrompts.findFirst({
    where: eq(writingPrompts.id, submission.promptId),
  });
  if (!prompt) throw new NotFoundError(`Unknown writing prompt: ${submission.promptId}`);

  const feedback = await getWritingFeedback({
    taskType: prompt.taskType,
    promptEn: prompt.promptEn,
    userText: submission.text,
    wordCount: submission.wordCount,
  });

  // Compare-and-set on status so a concurrent retry can't overwrite this one.
  const [updated] = await db
    .update(writingSubmissions)
    .set({
      status: "ai_scored",
      feedback,
      model: process.env.MERCURY_AI_MODEL || "claude-sonnet-5",
    })
    .where(
      and(eq(writingSubmissions.id, submission.id), eq(writingSubmissions.status, "self_assessed")),
    )
    .returning();

  if (updated) return { submissionId: submission.id, status: "ai_scored", feedback };

  // Lost the race: a concurrent retry already scored this submission. Return
  // the persisted feedback so the caller can't show a result that never
  // reached the database.
  const stored = await db.query.writingSubmissions.findFirst({
    where: and(eq(writingSubmissions.id, submission.id), eq(writingSubmissions.userId, userId)),
  });
  return {
    submissionId: submission.id,
    status: "ai_scored",
    feedback: stored?.feedback ?? feedback,
  };
}
