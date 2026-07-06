import { and, desc, eq } from "drizzle-orm";
import type { Track } from "../../content/types";
import { db } from "../db";
import { writingPrompts, writingSubmissions } from "../db/schema";

/** Track's writing prompts plus the user's submission count per prompt. */
export async function listWritingPrompts(userId: string, track: Track) {
  const [prompts, submissions] = await Promise.all([
    db.query.writingPrompts.findMany({
      where: eq(writingPrompts.track, track),
      orderBy: writingPrompts.id,
    }),
    db.query.writingSubmissions.findMany({
      where: eq(writingSubmissions.userId, userId),
      orderBy: desc(writingSubmissions.createdAt),
    }),
  ]);

  const submissionCountByPrompt = new Map<string, number>();
  for (const s of submissions) {
    submissionCountByPrompt.set(s.promptId, (submissionCountByPrompt.get(s.promptId) ?? 0) + 1);
  }

  return { prompts, submissionCountByPrompt };
}

/** One prompt with the user's recent submissions to it. */
export async function getWritingPromptWithHistory(userId: string, promptId: string) {
  const prompt = await db.query.writingPrompts.findFirst({
    where: eq(writingPrompts.id, promptId),
  });
  if (!prompt) return null;

  const past = await db.query.writingSubmissions.findMany({
    where: and(eq(writingSubmissions.userId, userId), eq(writingSubmissions.promptId, promptId)),
    orderBy: desc(writingSubmissions.createdAt),
    limit: 10,
  });

  return { prompt, past };
}

/** A user's submission with its prompt (owner-scoped). */
export async function getWritingSubmissionDetail(userId: string, submissionId: string) {
  const submission = await db.query.writingSubmissions.findFirst({
    where: and(eq(writingSubmissions.id, submissionId), eq(writingSubmissions.userId, userId)),
  });
  if (!submission) return null;

  const prompt = await db.query.writingPrompts.findFirst({
    where: eq(writingPrompts.id, submission.promptId),
  });
  if (!prompt) return null;

  return { submission, prompt };
}
