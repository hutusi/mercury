import { and, desc, eq } from "drizzle-orm";
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
    db.query.speakingSubmissions.findMany({
      where: eq(speakingSubmissions.userId, userId),
      orderBy: desc(speakingSubmissions.createdAt),
    }),
  ]);

  const submissionCountByPrompt = new Map<string, number>();
  for (const s of submissions) {
    submissionCountByPrompt.set(s.promptId, (submissionCountByPrompt.get(s.promptId) ?? 0) + 1);
  }

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
  const submission = await db.query.speakingSubmissions.findFirst({
    where: and(eq(speakingSubmissions.id, submissionId), eq(speakingSubmissions.userId, userId)),
  });
  if (!submission) return null;

  const prompt = await db.query.speakingPrompts.findFirst({
    where: eq(speakingPrompts.id, submission.promptId),
  });
  if (!prompt) return null;

  return { submission, prompt };
}
