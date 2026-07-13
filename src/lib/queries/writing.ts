import { and, count, desc, eq } from "drizzle-orm";
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
    db
      .select({ promptId: writingSubmissions.promptId, count: count() })
      .from(writingSubmissions)
      .innerJoin(writingPrompts, eq(writingSubmissions.promptId, writingPrompts.id))
      .where(and(eq(writingSubmissions.userId, userId), eq(writingPrompts.track, track)))
      .groupBy(writingSubmissions.promptId),
  ]);

  const submissionCountByPrompt = new Map<string, number>();
  for (const submission of submissions)
    submissionCountByPrompt.set(submission.promptId, submission.count);

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
  const [row] = await db
    .select({ submission: writingSubmissions, prompt: writingPrompts })
    .from(writingSubmissions)
    .innerJoin(writingPrompts, eq(writingSubmissions.promptId, writingPrompts.id))
    .where(and(eq(writingSubmissions.id, submissionId), eq(writingSubmissions.userId, userId)))
    .limit(1);
  return row ?? null;
}
