import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { McqQuestion } from "@/content/types";
import { db } from "../db";
import {
  exerciseAttempts,
  listeningExercises,
  mistakeClears,
  mockExamAttempts,
  mockExams,
  readingExercises,
  vocabWords,
} from "../db/schema";
import { deriveMistakes, sourceKey, type MistakeKind } from "../mistakes-core";
import { recordActivity } from "../streak";
import { IntegrityError, NotFoundError } from "./errors";

export const RetestSchema = z.object({
  kind: z.enum(["reading", "listening", "exam"]),
  refId: z.string(),
  questionId: z.string(),
  chosenIndex: z.number().int().min(0).max(3),
});

export interface RetestResult {
  correct: boolean;
  correctIndex: number;
  explanationZh: string;
}

/** Records "answered correctly on the mistakes page"; upsert refreshes clearedAt
 *  so re-clearing a revived mistake outweighs the newer wrong answer. */
async function upsertClear(userId: string, kind: MistakeKind, refId: string, questionId: string) {
  await db
    .insert(mistakeClears)
    .values({ userId, kind, refId, questionId })
    .onConflictDoUpdate({
      target: [
        mistakeClears.userId,
        mistakeClears.kind,
        mistakeClears.refId,
        mistakeClears.questionId,
      ],
      set: { clearedAt: new Date() },
    });
}

/**
 * The question must be one of the caller's ACTIVE mistakes: without this
 * check, a user mid-exam could call the mutation directly and extract the
 * answer key for questions they've never answered. Re-derives the wrong-set
 * for this single source with the same core logic the page uses.
 */
async function isActiveMistake(
  userId: string,
  kind: "reading" | "listening" | "exam",
  refId: string,
  questions: McqQuestion[],
  questionId: string,
): Promise<boolean> {
  const [attempts, clears] = await Promise.all([
    kind === "exam"
      ? db.query.mockExamAttempts
          .findMany({
            where: and(
              eq(mockExamAttempts.userId, userId),
              eq(mockExamAttempts.examId, refId),
              eq(mockExamAttempts.status, "completed"),
            ),
            columns: { answers: true, completedAt: true },
          })
          .then((rows) =>
            rows.flatMap((r) =>
              r.completedAt
                ? [{ kind, refId, completedAt: r.completedAt, answers: r.answers }]
                : [],
            ),
          )
      : db.query.exerciseAttempts
          .findMany({
            where: and(
              eq(exerciseAttempts.userId, userId),
              eq(exerciseAttempts.kind, kind),
              eq(exerciseAttempts.refId, refId),
            ),
            columns: { answers: true, completedAt: true },
          })
          .then((rows) =>
            rows.map((r) => ({ kind, refId, completedAt: r.completedAt, answers: r.answers })),
          ),
    db.query.mistakeClears.findMany({
      where: and(
        eq(mistakeClears.userId, userId),
        eq(mistakeClears.kind, kind),
        eq(mistakeClears.refId, refId),
        eq(mistakeClears.questionId, questionId),
      ),
    }),
  ]);

  const answerKeys = new Map([
    [sourceKey(kind, refId), new Map(questions.map((q) => [q.id, q.correctIndex]))],
  ]);
  return deriveMistakes(attempts, answerKeys, clears).some(
    (s) => s.questionId === questionId && !s.cleared,
  );
}

/** Re-test a reading/listening/exam mistake; a correct answer clears it. */
export async function retestMistakeForUser(userId: string, input: unknown): Promise<RetestResult> {
  const { kind, refId, questionId, chosenIndex } = RetestSchema.parse(input);

  let questions: McqQuestion[] | undefined;
  if (kind === "reading" || kind === "listening") {
    const exercise =
      kind === "reading"
        ? await db.query.readingExercises.findFirst({ where: eq(readingExercises.id, refId) })
        : await db.query.listeningExercises.findFirst({ where: eq(listeningExercises.id, refId) });
    questions = exercise?.questions;
  } else {
    const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, refId) });
    questions = exam?.sections.flatMap((s) => s.groups).flatMap((g) => g.questions);
  }
  const question = questions?.find((q) => q.id === questionId);
  if (!question) throw new NotFoundError(`Unknown ${kind} question: ${refId}/${questionId}`);

  if (!(await isActiveMistake(userId, kind, refId, questions!, questionId))) {
    throw new IntegrityError(`Not an active mistake: ${kind}/${refId}/${questionId}`);
  }

  const correct = chosenIndex === question.correctIndex;
  if (correct) {
    await upsertClear(userId, kind, refId, questionId);
  }
  await recordActivity(userId);

  // The answer key ships only after an answer, mirroring submitExerciseAttempt.
  return { correct, correctIndex: question.correctIndex, explanationZh: question.explanationZh };
}

export const VocabRetestSchema = z.object({
  wordId: z.string(),
  chosenWordId: z.string(),
});

/** Re-test a vocab mistake by word-id equality; a correct answer clears it. */
export async function retestVocabMistakeForUser(
  userId: string,
  input: unknown,
): Promise<{ correct: boolean }> {
  const { wordId, chosenWordId } = VocabRetestSchema.parse(input);

  const word = await db.query.vocabWords.findFirst({ where: eq(vocabWords.id, wordId) });
  if (!word) throw new NotFoundError(`Unknown vocab word: ${wordId}`);

  // Same integrity model as submitQuiz: options carry word ids, grading is id
  // equality; the regenerated question's key never needs to reach the client.
  const correct = chosenWordId === wordId;
  if (correct) {
    // Mirrors exercise_attempts identity for vocab: refId = quiz-${track}.
    await upsertClear(userId, "vocab_quiz", `quiz-${word.track}`, wordId);
  }
  await recordActivity(userId);

  return { correct };
}
