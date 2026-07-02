"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "../auth/session";
import { db } from "../db";
import { listeningExercises, readingExercises } from "../db/schema";
import { exerciseAttempts } from "../db/schema";
import { recordActivity } from "../streak";

const SubmitSchema = z.object({
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

export async function submitExerciseAttempt(
  input: z.infer<typeof SubmitSchema>,
): Promise<GradedExercise> {
  const user = await requireUser();
  const { kind, refId, answers, durationSeconds } = SubmitSchema.parse(input);

  const exercise =
    kind === "reading"
      ? await db.query.readingExercises.findFirst({ where: eq(readingExercises.id, refId) })
      : await db.query.listeningExercises.findFirst({ where: eq(listeningExercises.id, refId) });
  if (!exercise) throw new Error(`Unknown ${kind} exercise: ${refId}`);

  const perQuestion = exercise.questions.map((q) => ({
    questionId: q.id,
    correctIndex: q.correctIndex,
    explanationZh: q.explanationZh,
    correct: answers[q.id] === q.correctIndex,
  }));
  const score = perQuestion.filter((p) => p.correct).length;
  const total = perQuestion.length;

  await db.insert(exerciseAttempts).values({
    userId: user.id,
    kind,
    refId,
    track: exercise.track,
    answers,
    score,
    total,
    durationSeconds,
  });
  await recordActivity(user.id);

  return { score, total, perQuestion };
}
