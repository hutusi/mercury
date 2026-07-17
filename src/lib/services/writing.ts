import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { activeAiModel, AiUnavailableError, getWritingFeedback, isAiEnabled } from "../ai/client";
import type { WritingFeedback } from "../ai/schemas";
import type { WritingTaskType } from "../../content/types";
import { gradingInputHash } from "../ai-grading-core";
import {
  claimGradingRequest,
  completeGradingRequestWith,
  failGradingRequest,
} from "../ai-grading-usage";
import { db } from "../db";
import { writingPrompts, writingSubmissions } from "../db/schema";
import { formatLearnerContext, normalizeAiScore } from "../learner-model-core";
import { getLearnerProfile } from "../queries/profile";
import { recordActivityWith } from "../streak";
import { NotFoundError } from "./errors";
import { recordLearnerOutcomeSafely } from "./profile";

/**
 * The <learner_profile> block for the grader: profile + rubric scores from
 * the last few AI-graded essays. Guarded — context is an enhancement, never
 * a reason for a submission to fail or degrade.
 */
async function writingLearnerContext(userId: string): Promise<string | undefined> {
  try {
    const profile = await getLearnerProfile(userId);
    if (!profile) return undefined;
    const recent = await db.query.writingSubmissions.findMany({
      where: and(eq(writingSubmissions.userId, userId), eq(writingSubmissions.status, "ai_scored")),
      orderBy: [desc(writingSubmissions.createdAt)],
      limit: 3,
    });
    const recentCriteria = recent.flatMap(
      (s) => s.feedback?.criteria.map((c) => ({ name: c.name, score: c.score })) ?? [],
    );
    return formatLearnerContext({
      goalTrack: profile.goalTrack,
      targetScore: profile.targetScore,
      examDate: profile.examDate,
      selfRatedLevel: profile.selfRatedLevel,
      skillEstimates: profile.skillEstimates,
      coachMemo: profile.coachMemo,
      recentCriteria,
      today: new Date(),
    });
  } catch (error) {
    console.error("[writing] learner context failed", error);
    return undefined;
  }
}

/** IELTS tasks score on the 0-9 band scale; everything else is 0-100. */
function writingScoreScale(taskType: WritingTaskType): "band9" | "pct100" {
  return taskType.startsWith("ielts") ? "band9" : "pct100";
}

/** Post-grading learner-model hooks; both are guarded internally. */
async function recordWritingOutcome(
  userId: string,
  taskType: WritingTaskType,
  feedback: WritingFeedback,
) {
  await recordLearnerOutcomeSafely(userId, {
    signals: [
      {
        skill: "writing",
        value: normalizeAiScore(writingScoreScale(taskType), feedback.overallScore),
        source: "ai_feedback",
      },
    ],
    memoUpdate: feedback.memoUpdate,
  });
}

export const SubmitWritingSchema = z.object({
  requestId: z.string().uuid(),
  promptId: z.string(),
  text: z.string().min(20).max(30000),
});

export const RetryWritingSchema = z.object({ requestId: z.string().uuid() });

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface WritingResult {
  submissionId: string;
  status: "ai_scored" | "self_assessed";
  feedback: WritingFeedback | null;
}

async function getPersistedWritingResult(
  userId: string,
  submissionId: string,
): Promise<WritingResult> {
  const submission = await db.query.writingSubmissions.findFirst({
    where: and(eq(writingSubmissions.id, submissionId), eq(writingSubmissions.userId, userId)),
  });
  if (!submission || submission.status === "failed") {
    throw new NotFoundError("Submission not found");
  }
  return {
    submissionId: submission.id,
    status: submission.status,
    feedback: submission.feedback,
  };
}

/** AI-grade an essay; on any AI failure degrade to self-assessment. */
export async function submitWritingForUser(userId: string, input: unknown): Promise<WritingResult> {
  const { requestId, promptId, text } = SubmitWritingSchema.parse(input);

  const prompt = await db.query.writingPrompts.findFirst({
    where: eq(writingPrompts.id, promptId),
  });
  if (!prompt) throw new NotFoundError(`Unknown writing prompt: ${promptId}`);

  const wordCount = countWords(text);
  const inputHash = gradingInputHash({ promptId, text });
  const aiEnabled = isAiEnabled();
  const claim = await claimGradingRequest({
    userId,
    requestId,
    kind: "writing",
    scope: `writing:submit:${inputHash}`,
    inputHash,
    charge: aiEnabled,
  });
  if (claim.disposition === "completed") {
    return getPersistedWritingResult(userId, claim.submissionId);
  }
  const learnerContext = await writingLearnerContext(userId);

  let feedback: WritingFeedback | null = null;
  let status: "ai_scored" | "self_assessed" = "self_assessed";
  if (aiEnabled) {
    try {
      feedback = await getWritingFeedback({
        taskType: prompt.taskType,
        promptEn: prompt.promptEn,
        userText: text,
        wordCount,
        learnerContext,
      });
      status = "ai_scored";
    } catch {
      // API error, refusal, or schema mismatch — degrade to self-assessment.
      feedback = null;
      status = "self_assessed";
    }
  }

  const submission = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(writingSubmissions)
      .values({
        userId,
        promptId,
        text,
        wordCount,
        status,
        feedback,
        model: status === "ai_scored" ? activeAiModel() : null,
      })
      .returning({ id: writingSubmissions.id });
    await recordActivityWith(tx, userId);
    await completeGradingRequestWith(tx, {
      userId,
      requestId,
      claimId: claim.claimId,
      submissionId: row.id,
    });
    return row;
  });

  if (status === "ai_scored" && feedback) {
    await recordWritingOutcome(userId, prompt.taskType, feedback);
  }
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
  input: unknown,
): Promise<WritingResult> {
  const { requestId } = RetryWritingSchema.parse(input);
  const submission = await db.query.writingSubmissions.findFirst({
    where: and(eq(writingSubmissions.id, submissionId), eq(writingSubmissions.userId, userId)),
  });
  if (!submission) throw new NotFoundError("Submission not found");
  if (submission.status === "ai_scored") {
    return { submissionId: submission.id, status: "ai_scored", feedback: submission.feedback };
  }
  if (submission.status !== "self_assessed") {
    throw new NotFoundError("Submission not found");
  }
  if (!isAiEnabled()) {
    // Keyless is a supported submit path, but a retry has no work it can do.
    throw new AiUnavailableError("No AI provider is configured");
  }

  const inputHash = gradingInputHash({ submissionId: submission.id });
  const claim = await claimGradingRequest({
    userId,
    requestId,
    kind: "writing",
    scope: `writing:retry:${submission.id}`,
    inputHash,
    charge: true,
  });
  if (claim.disposition === "completed") {
    return getPersistedWritingResult(userId, claim.submissionId);
  }

  const prompt = await db.query.writingPrompts.findFirst({
    where: eq(writingPrompts.id, submission.promptId),
  });
  if (!prompt) throw new NotFoundError(`Unknown writing prompt: ${submission.promptId}`);
  const learnerContext = await writingLearnerContext(userId);

  let feedback: WritingFeedback;
  try {
    feedback = await getWritingFeedback({
      taskType: prompt.taskType,
      promptEn: prompt.promptEn,
      userText: submission.text,
      wordCount: submission.wordCount,
      learnerContext,
    });
  } catch (error) {
    await failGradingRequest({ userId, requestId, claimId: claim.claimId });
    throw error;
  }

  // The request ledger serializes retries before the provider call. Keep the
  // final submission update and idempotency completion atomic as well.
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(writingSubmissions)
      .set({ status: "ai_scored", feedback, model: activeAiModel() })
      .where(
        and(
          eq(writingSubmissions.id, submission.id),
          eq(writingSubmissions.status, "self_assessed"),
        ),
      )
      .returning();
    await completeGradingRequestWith(tx, {
      userId,
      requestId,
      claimId: claim.claimId,
      submissionId: submission.id,
    });
    return row;
  });

  if (updated) {
    await recordWritingOutcome(userId, prompt.taskType, feedback);
    return { submissionId: submission.id, status: "ai_scored", feedback };
  }

  // Lost the race: a concurrent retry already scored this submission. Return
  // the persisted feedback so the caller can't show a result that never
  // reached the database.
  return getPersistedWritingResult(userId, submission.id);
}
