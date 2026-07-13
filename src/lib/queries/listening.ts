import { and, eq, max } from "drizzle-orm";
import type { Track } from "../../content/types";
import { db } from "../db";
import { exerciseAttempts, listeningExercises } from "../db/schema";

/** Track's listening exercises plus the user's best score per exercise. */
export async function listListeningExercises(userId: string, track: Track) {
  const [exercises, attempts] = await Promise.all([
    db.query.listeningExercises.findMany({
      where: eq(listeningExercises.track, track),
      orderBy: listeningExercises.id,
    }),
    db
      .select({
        refId: exerciseAttempts.refId,
        score: max(exerciseAttempts.score),
        total: max(exerciseAttempts.total),
      })
      .from(exerciseAttempts)
      .where(
        and(
          eq(exerciseAttempts.userId, userId),
          eq(exerciseAttempts.kind, "listening"),
          eq(exerciseAttempts.track, track),
        ),
      )
      .groupBy(exerciseAttempts.refId),
  ]);

  const bestByExercise = new Map<string, { score: number; total: number }>();
  for (const attempt of attempts) {
    if (attempt.score !== null && attempt.total !== null) {
      bestByExercise.set(attempt.refId, { score: attempt.score, total: attempt.total });
    }
  }

  return { exercises, bestByExercise };
}

/** One exercise with answers stripped; the script stays — clients need it for TTS. */
export async function getListeningExerciseSanitized(exerciseId: string) {
  const exercise = await db.query.listeningExercises.findFirst({
    where: eq(listeningExercises.id, exerciseId),
  });
  if (!exercise) return null;

  return {
    id: exercise.id,
    track: exercise.track,
    title: exercise.title,
    titleZh: exercise.titleZh,
    style: exercise.style,
    script: exercise.script,
    questions: exercise.questions.map(({ id, stem, options }) => ({ id, stem, options })),
  };
}
