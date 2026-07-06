import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { exerciseAttempts, listeningExercises, readingExercises } from "../db/schema";
import { recordActivity } from "../streak";
import { NotFoundError } from "./errors";

export const SubmitExerciseSchema = z.object({
  kind: z.enum(["reading", "listening"]),
  refId: z.string(),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
  durationSeconds: z
    .number()
    .int()
    .nonnegative()
    .max(60 * 60 * 6),
});

export interface GradedExercise {
  score: number;
  total: number;
  perQuestion: {
    questionId: string;
    correctIndex: number;
    explanationZh: string;
    correct: boolean;
  }[];
}

/** Grade a reading/listening MCQ attempt, persist it, and bump the streak. */
export async function submitExerciseAttemptForUser(
  userId: string,
  input: unknown,
): Promise<GradedExercise> {
  const { kind, refId, answers, durationSeconds } = SubmitExerciseSchema.parse(input);

  const exercise =
    kind === "reading"
      ? await db.query.readingExercises.findFirst({ where: eq(readingExercises.id, refId) })
      : await db.query.listeningExercises.findFirst({ where: eq(listeningExercises.id, refId) });
  if (!exercise) throw new NotFoundError(`Unknown ${kind} exercise: ${refId}`);

  const perQuestion = exercise.questions.map((q) => ({
    questionId: q.id,
    correctIndex: q.correctIndex,
    explanationZh: q.explanationZh,
    correct: answers[q.id] === q.correctIndex,
  }));
  const score = perQuestion.filter((p) => p.correct).length;
  const total = perQuestion.length;

  await db.insert(exerciseAttempts).values({
    userId,
    kind,
    refId,
    track: exercise.track,
    answers,
    score,
    total,
    durationSeconds,
  });
  await recordActivity(userId);

  return { score, total, perQuestion };
}
