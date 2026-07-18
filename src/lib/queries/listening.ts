import { and, desc, eq } from "drizzle-orm";
import type { Track } from "../../content/types";
import { db } from "../db";
import { exerciseAttempts, listeningExercises } from "../db/schema";

/** Listening exercises (one track, or all when null) plus the user's best score per exercise. */
export async function listListeningExercises(userId: string, track: Track | null) {
  const [exercises, attempts] = await Promise.all([
    db.query.listeningExercises.findMany({
      where: track ? eq(listeningExercises.track, track) : undefined,
      orderBy: listeningExercises.id,
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
          eq(exerciseAttempts.kind, "listening"),
          track ? eq(exerciseAttempts.track, track) : undefined,
        ),
      )
      .orderBy(
        exerciseAttempts.refId,
        desc(exerciseAttempts.score),
        desc(exerciseAttempts.completedAt),
        // Deterministic winner when score and completedAt (ms) both tie.
        desc(exerciseAttempts.id),
      ),
  ]);

  const bestByExercise = new Map<string, { score: number; total: number }>();
  for (const attempt of attempts) {
    bestByExercise.set(attempt.refId, { score: attempt.score, total: attempt.total });
  }

  return { exercises, bestByExercise };
}

/**
 * One exercise with answers stripped. audioUrl (nullable) points at the
 * pre-generated neural audio (ADR 0021); the script stays regardless —
 * clients need it for the browser-TTS fallback and the post-submit transcript.
 */
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
    audioUrl: exercise.audioUrl,
    questions: exercise.questions.map(({ id, stem, options }) => ({ id, stem, options })),
  };
}
