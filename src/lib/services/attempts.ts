import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { gradingInputHash } from "../ai-grading-core";
import { db } from "../db";
import { exerciseAttempts, listeningExercises, readingExercises } from "../db/schema";
import { recordActivityWith } from "../streak";
import { ConflictError, NotFoundError } from "./errors";
import { recordMistakeOutcomes } from "./mistake-state";
import { recordSkillSignalSafely } from "./profile";

export const SubmitExerciseSchema = z.object({
  requestId: z.string().uuid(),
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
  const { requestId, kind, refId, answers, durationSeconds } = SubmitExerciseSchema.parse(input);

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
  // The graded input, minus incidental timing: a network retry sends the same
  // answers with a slightly larger durationSeconds and must stay idempotent.
  const inputHash = gradingInputHash({ kind, refId, answers });

  const completedAt = new Date();
  const winner = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(exerciseAttempts)
      .values({
        userId,
        kind,
        refId,
        track: exercise.track,
        answers,
        score,
        total,
        durationSeconds,
        completedAt,
        requestId,
        inputHash,
      })
      .onConflictDoNothing({
        target: [exerciseAttempts.userId, exerciseAttempts.requestId],
        where: sql`${exerciseAttempts.requestId} is not null`,
      })
      .returning({ id: exerciseAttempts.id });

    if (!inserted) {
      // A row already exists for this (user, requestId). Same input → idempotent
      // replay (return the recomputed grade, no side effects); different input →
      // the id was reused for a different attempt, which is a conflict.
      const [prior] = await tx
        .select({ inputHash: exerciseAttempts.inputHash })
        .from(exerciseAttempts)
        .where(and(eq(exerciseAttempts.userId, userId), eq(exerciseAttempts.requestId, requestId)))
        .limit(1);
      if (!prior || prior.inputHash !== inputHash) {
        throw new ConflictError(
          "This request id was already used for a different attempt",
          "exercise_request_conflict",
        );
      }
      return false;
    }

    await recordMistakeOutcomes(tx, {
      userId,
      track: exercise.track,
      kind,
      refId,
      occurredAt: completedAt,
      outcomes: perQuestion.map((question) => ({
        questionId: question.questionId,
        correct: question.correct,
      })),
    });
    await recordActivityWith(tx, userId);
    return true;
  });

  // Skill signal only for the winning insert, and only after it commits — a
  // replay must not re-apply it (the read model already reflects this attempt).
  if (winner && total > 0) {
    await recordSkillSignalSafely(userId, {
      skill: kind,
      value: (score / total) * 100,
      source: "exercise",
    });
  }

  return { score, total, perQuestion };
}
