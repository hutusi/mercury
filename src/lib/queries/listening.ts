import { and, eq } from "drizzle-orm";
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
    db.query.exerciseAttempts.findMany({
      where: and(eq(exerciseAttempts.userId, userId), eq(exerciseAttempts.kind, "listening")),
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
