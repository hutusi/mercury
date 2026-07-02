"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSpeakingFeedback } from "../ai/client";
import type { SpeakingFeedback } from "../ai/schemas";
import { requireUser } from "../auth/session";
import { db } from "../db";
import { speakingPrompts, speakingSubmissions } from "../db/schema";
import { recordActivity } from "../streak";

const SubmitSchema = z.object({
  promptId: z.string(),
  transcript: z.string().min(10).max(20000),
  durationSeconds: z.number().int().nonnegative().max(600),
});

export interface SpeakingResult {
  submissionId: string;
  status: "ai_scored" | "self_assessed";
  feedback: SpeakingFeedback | null;
}

export async function submitSpeaking(input: {
  promptId: string;
  transcript: string;
  durationSeconds: number;
}): Promise<SpeakingResult> {
  const user = await requireUser();
  const { promptId, transcript, durationSeconds } = SubmitSchema.parse(input);

  const prompt = await db.query.speakingPrompts.findFirst({
    where: eq(speakingPrompts.id, promptId),
  });
  if (!prompt) throw new Error(`Unknown speaking prompt: ${promptId}`);

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
      userId: user.id,
      promptId,
      transcript,
      durationSeconds,
      status,
      feedback,
      model: status === "ai_scored" ? process.env.MERCURY_AI_MODEL || "claude-sonnet-5" : null,
    })
    .returning({ id: speakingSubmissions.id });

  await recordActivity(user.id);
  return { submissionId: submission.id, status, feedback };
}
