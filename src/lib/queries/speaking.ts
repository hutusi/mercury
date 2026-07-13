import { and, count, desc, eq } from "drizzle-orm";
import type { Track } from "../../content/types";
import { db } from "../db";
import { speakingPrompts, speakingSubmissions } from "../db/schema";

/** Track's speaking prompts plus the user's submission count per prompt. */
export async function listSpeakingPrompts(userId: string, track: Track) {
  const [prompts, submissions] = await Promise.all([
    db.query.speakingPrompts.findMany({
      where: eq(speakingPrompts.track, track),
      orderBy: speakingPrompts.id,
    }),
    db
      .select({ promptId: speakingSubmissions.promptId, count: count() })
      .from(speakingSubmissions)
      .innerJoin(speakingPrompts, eq(speakingSubmissions.promptId, speakingPrompts.id))
      .where(and(eq(speakingSubmissions.userId, userId), eq(speakingPrompts.track, track)))
      .groupBy(speakingSubmissions.promptId),
  ]);

  const submissionCountByPrompt = new Map<string, number>();
  for (const submission of submissions)
    submissionCountByPrompt.set(submission.promptId, submission.count);

  return { prompts, submissionCountByPrompt };
}

/** One prompt with the user's recent submissions to it. */
export async function getSpeakingPromptWithHistory(userId: string, promptId: string) {
  const [prompt, past] = await Promise.all([
    db.query.speakingPrompts.findFirst({ where: eq(speakingPrompts.id, promptId) }),
    db.query.speakingSubmissions.findMany({
      where: and(
        eq(speakingSubmissions.userId, userId),
        eq(speakingSubmissions.promptId, promptId),
      ),
      orderBy: desc(speakingSubmissions.createdAt),
      limit: 10,
    }),
  ]);
  if (!prompt) return null;

  return { prompt, past };
}

/** A user's submission with its prompt (owner-scoped). */
export async function getSpeakingSubmissionDetail(userId: string, submissionId: string) {
  const [row] = await db
    .select({ submission: speakingSubmissions, prompt: speakingPrompts })
    .from(speakingSubmissions)
    .innerJoin(speakingPrompts, eq(speakingSubmissions.promptId, speakingPrompts.id))
    .where(and(eq(speakingSubmissions.id, submissionId), eq(speakingSubmissions.userId, userId)))
    .limit(1);
  return row ?? null;
}
