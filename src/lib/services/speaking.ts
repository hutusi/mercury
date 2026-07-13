import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { activeAiModel, AiUnavailableError, getSpeakingFeedback, isAiEnabled } from "../ai/client";
import type { SpeakingFeedback } from "../ai/schemas";
import type { SpeakingPartType, Track } from "../../content/types";
import { gradingInputHash } from "../ai-grading-core";
import {
  claimGradingRequest,
  completeGradingRequestWith,
  failGradingRequest,
} from "../ai-grading-usage";
import { db } from "../db";
import { speakingPrompts, speakingSubmissions } from "../db/schema";
import { formatLearnerContext, normalizeAiScore } from "../learner-model-core";
import { getLearnerProfile } from "../queries/profile";
import { recordActivityWith } from "../streak";
import { NotFoundError } from "./errors";
import { recordLearnerOutcomeSafely } from "./profile";

/**
 * The <learner_profile> block for the grader: profile + fluency/vocabulary/
 * grammar scores from the last few AI-graded answers. Guarded — context is an
 * enhancement, never a reason for a submission to fail or degrade.
 */
async function speakingLearnerContext(
  userId: string,
  promptTrack: Track,
): Promise<string | undefined> {
  try {
    const profile = await getLearnerProfile(userId);
    if (!profile) return undefined;
    const recent = await db.query.speakingSubmissions.findMany({
      where: and(
        eq(speakingSubmissions.userId, userId),
        eq(speakingSubmissions.status, "ai_scored"),
      ),
      orderBy: [desc(speakingSubmissions.createdAt)],
      limit: 3,
    });
    const recentCriteria = recent.flatMap((s) =>
      s.feedback
        ? [
            { name: "Fluency", score: s.feedback.fluency.score },
            { name: "Vocabulary", score: s.feedback.vocabulary.score },
            { name: "Grammar", score: s.feedback.grammar.score },
          ]
        : [],
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
    console.error("[speaking] learner context failed", error);
    return undefined;
  }
}

/** IELTS parts score on the 0-9 band scale; everything else is 0-100. */
function speakingScoreScale(partType: SpeakingPartType): "band9" | "pct100" {
  return partType.startsWith("ielts") ? "band9" : "pct100";
}

/** Post-grading learner-model hooks; both are guarded internally. */
async function recordSpeakingOutcome(
  userId: string,
  partType: SpeakingPartType,
  feedback: SpeakingFeedback,
) {
  await recordLearnerOutcomeSafely(userId, {
    signals: [
      {
        skill: "speaking",
        value: normalizeAiScore(speakingScoreScale(partType), feedback.overallScore),
        source: "ai_feedback",
      },
    ],
    memoUpdate: feedback.memoUpdate,
  });
}

export const SubmitSpeakingSchema = z.object({
  requestId: z.string().uuid(),
  promptId: z.string(),
  transcript: z.string().min(10).max(20000),
  durationSeconds: z.number().int().nonnegative().max(600),
});

export const RetrySpeakingSchema = z.object({ requestId: z.string().uuid() });

export interface SpeakingResult {
  submissionId: string;
  status: "ai_scored" | "self_assessed";
  feedback: SpeakingFeedback | null;
}

async function getPersistedSpeakingResult(
  userId: string,
  submissionId: string,
): Promise<SpeakingResult> {
  const submission = await db.query.speakingSubmissions.findFirst({
    where: and(eq(speakingSubmissions.id, submissionId), eq(speakingSubmissions.userId, userId)),
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

/** AI-grade a spoken transcript; on any AI failure degrade to self-assessment. */
export async function submitSpeakingForUser(
  userId: string,
  input: unknown,
): Promise<SpeakingResult> {
  const { requestId, promptId, transcript, durationSeconds } = SubmitSpeakingSchema.parse(input);

  const prompt = await db.query.speakingPrompts.findFirst({
    where: eq(speakingPrompts.id, promptId),
  });
  if (!prompt) throw new NotFoundError(`Unknown speaking prompt: ${promptId}`);

  const learnerContext = await speakingLearnerContext(userId, prompt.track);
  const inputHash = gradingInputHash({ promptId, transcript, durationSeconds });
  const aiEnabled = isAiEnabled();
  const claim = await claimGradingRequest({
    userId,
    requestId,
    kind: "speaking",
    scope: `speaking:submit:${inputHash}`,
    inputHash,
    charge: aiEnabled,
  });
  if (claim.disposition === "completed") {
    return getPersistedSpeakingResult(userId, claim.submissionId);
  }

  let feedback: SpeakingFeedback | null = null;
  let status: "ai_scored" | "self_assessed" = "self_assessed";
  if (aiEnabled) {
    try {
      feedback = await getSpeakingFeedback({
        partType: prompt.partType,
        promptEn: prompt.promptEn,
        transcript,
        durationSeconds,
        learnerContext,
      });
      status = "ai_scored";
    } catch {
      feedback = null;
      status = "self_assessed";
    }
  }

  const submission = await db.transaction(async (tx) => {
    const [row] = await tx
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
    await recordSpeakingOutcome(userId, prompt.partType, feedback);
  }
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
  input: unknown,
): Promise<SpeakingResult> {
  const { requestId } = RetrySpeakingSchema.parse(input);
  const submission = await db.query.speakingSubmissions.findFirst({
    where: and(eq(speakingSubmissions.id, submissionId), eq(speakingSubmissions.userId, userId)),
  });
  if (!submission) throw new NotFoundError("Submission not found");
  if (submission.status === "ai_scored") {
    return { submissionId: submission.id, status: "ai_scored", feedback: submission.feedback };
  }
  if (!isAiEnabled()) {
    throw new AiUnavailableError("No AI provider is configured");
  }

  const prompt = await db.query.speakingPrompts.findFirst({
    where: eq(speakingPrompts.id, submission.promptId),
  });
  if (!prompt) throw new NotFoundError(`Unknown speaking prompt: ${submission.promptId}`);

  const learnerContext = await speakingLearnerContext(userId, prompt.track);
  const inputHash = gradingInputHash({ submissionId: submission.id });
  const claim = await claimGradingRequest({
    userId,
    requestId,
    kind: "speaking",
    scope: `speaking:retry:${submission.id}`,
    inputHash,
    charge: true,
  });
  if (claim.disposition === "completed") {
    return getPersistedSpeakingResult(userId, claim.submissionId);
  }

  let feedback: SpeakingFeedback;
  try {
    feedback = await getSpeakingFeedback({
      partType: prompt.partType,
      promptEn: prompt.promptEn,
      transcript: submission.transcript,
      durationSeconds: submission.durationSeconds,
      learnerContext,
    });
  } catch (error) {
    await failGradingRequest({ userId, requestId, claimId: claim.claimId });
    throw error;
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(speakingSubmissions)
      .set({ status: "ai_scored", feedback, model: activeAiModel() })
      .where(
        and(
          eq(speakingSubmissions.id, submission.id),
          eq(speakingSubmissions.status, "self_assessed"),
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
    await recordSpeakingOutcome(userId, prompt.partType, feedback);
    return { submissionId: submission.id, status: "ai_scored", feedback };
  }

  // Lost the race: a concurrent retry already scored this submission. Return
  // the persisted feedback (status is necessarily ai_scored now) so the UI
  // can't show a result that never reached the database.
  return getPersistedSpeakingResult(userId, submission.id);
}
