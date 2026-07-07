import { and, eq } from "drizzle-orm";
import type { Track } from "../../content/types";
import { db } from "../db";
import { exerciseAttempts, readingExercises } from "../db/schema";

/** Track's reading exercises plus the user's best score per exercise. */
export async function listReadingExercises(userId: string, track: Track) {
  const [exercises, attempts] = await Promise.all([
    db.query.readingExercises.findMany({
      where: eq(readingExercises.track, track),
      orderBy: readingExercises.id,
    }),
    db.query.exerciseAttempts.findMany({
      where: and(eq(exerciseAttempts.userId, userId), eq(exerciseAttempts.kind, "reading")),
    }),
  ]);

  const bestByExercise = new Map<string, { score: number; total: number }>();
  for (const a of attempts) {
    const best = bestByExercise.get(a.refId);
    if (!best || a.score > best.score)
      bestByExercise.set(a.refId, { score: a.score, total: a.total });
  }

  return { exercises, bestByExercise };
}

/** One exercise with its questions stripped of answers — safe to ship pre-answer. */
export async function getReadingExerciseSanitized(exerciseId: string) {
  const exercise = await db.query.readingExercises.findFirst({
    where: eq(readingExercises.id, exerciseId),
  });
  if (!exercise) return null;

  return {
    id: exercise.id,
    track: exercise.track,
    title: exercise.title,
    titleZh: exercise.titleZh,
    genre: exercise.genre,
    passage: exercise.passage,
    suggestedMinutes: exercise.suggestedMinutes,
    // Never ship answers to the client while answering.
    questions: exercise.questions.map(({ id, stem, options }) => ({ id, stem, options })),
  };
}
