import { and, desc, eq } from "drizzle-orm";
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
    // The single best attempt per exercise, returning that row's own score AND
    // total together. Aggregating them independently could pair a high score
    // with a higher total from a later, longer version of the same exercise.
    db
      .selectDistinctOn([exerciseAttempts.refId], {
        refId: exerciseAttempts.refId,
        score: exerciseAttempts.score,
        total: exerciseAttempts.total,
      })
      .from(exerciseAttempts)
      .where(
        and(
          eq(exerciseAttempts.userId, userId),
          eq(exerciseAttempts.kind, "reading"),
          eq(exerciseAttempts.track, track),
        ),
      )
      .orderBy(
        exerciseAttempts.refId,
        desc(exerciseAttempts.score),
        desc(exerciseAttempts.completedAt),
      ),
  ]);

  const bestByExercise = new Map<string, { score: number; total: number }>();
  for (const attempt of attempts) {
    bestByExercise.set(attempt.refId, { score: attempt.score, total: attempt.total });
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
