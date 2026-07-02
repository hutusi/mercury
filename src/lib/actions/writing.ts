"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getWritingFeedback } from "../ai/client";
import type { WritingFeedback } from "../ai/schemas";
import { requireUser } from "../auth/session";
import { db } from "../db";
import { writingPrompts, writingSubmissions } from "../db/schema";
import { recordActivity } from "../streak";

const SubmitSchema = z.object({
  promptId: z.string(),
  text: z.string().min(20).max(30000),
});

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function submitWriting(input: {
  promptId: string;
  text: string;
}): Promise<{ submissionId: string }> {
  const user = await requireUser();
  const { promptId, text } = SubmitSchema.parse(input);

  const prompt = await db.query.writingPrompts.findFirst({
    where: eq(writingPrompts.id, promptId),
  });
  if (!prompt) throw new Error(`Unknown writing prompt: ${promptId}`);

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
      userId: user.id,
      promptId,
      text,
      wordCount,
      status,
      feedback,
      model: status === "ai_scored" ? process.env.MERCURY_AI_MODEL || "claude-sonnet-5" : null,
    })
    .returning({ id: writingSubmissions.id });

  await recordActivity(user.id);
  return { submissionId: submission.id };
}
