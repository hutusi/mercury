import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { activeAiModel, getWritingFeedback } from "../ai/client";
import type { WritingFeedback } from "../ai/schemas";
import type { Track, WritingTaskType } from "../../content/types";
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
async function writingLearnerContext(
  userId: string,
  promptTrack: Track,
): Promise<string | undefined> {
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
      activeTrack: promptTrack,
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

  const learnerContext = await writingLearnerContext(userId, prompt.track);

  let feedback: WritingFeedback | null = null;
  let status: "ai_scored" | "self_assessed" = "self_assessed";
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
    // No key, API error, refusal, or schema mismatch — degrade to self-assessment.
    feedback = null;
    status = "self_assessed";
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

  const learnerContext = await writingLearnerContext(userId, prompt.track);

  const feedback = await getWritingFeedback({
    taskType: prompt.taskType,
    promptEn: prompt.promptEn,
    userText: submission.text,
    wordCount: submission.wordCount,
    learnerContext,
  });

  // Compare-and-set on status so a concurrent retry can't overwrite this one.
  const [updated] = await db
    .update(writingSubmissions)
    .set({
      status: "ai_scored",
      feedback,
      model: activeAiModel(),
    })
    .where(
      and(eq(writingSubmissions.id, submission.id), eq(writingSubmissions.status, "self_assessed")),
    )
    .returning();

  if (updated) {
    await recordWritingOutcome(userId, prompt.taskType, feedback);
    return { submissionId: submission.id, status: "ai_scored", feedback };
  }

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
