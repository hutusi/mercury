import { and, eq, gt, isNull, or } from "drizzle-orm";
import { z } from "zod";
import type { McqQuestion, Track } from "@/content/types";
import { db, type DbExecutor } from "../db";
import {
  listeningExercises,
  mistakeClears,
  mockExams,
  mistakeStates,
  readingExercises,
} from "../db/schema";
import type { MistakeKind } from "../mistakes-core";
import { recordActivity, recordActivityWith } from "../streak";
import { IntegrityError, NotFoundError } from "./errors";
import { clearMistakeState } from "./mistake-state";

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
async function upsertClear(
  executor: DbExecutor,
  userId: string,
  kind: MistakeKind,
  refId: string,
  questionId: string,
) {
  await executor
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
 * answer key for questions they've never answered.
 */
async function isActiveMistake(
  userId: string,
  kind: "reading" | "listening" | "exam",
  refId: string,
  questionId: string,
): Promise<boolean> {
  const row = await db.query.mistakeStates.findFirst({
    where: and(
      eq(mistakeStates.userId, userId),
      eq(mistakeStates.kind, kind),
      eq(mistakeStates.refId, refId),
      eq(mistakeStates.questionId, questionId),
      gt(mistakeStates.wrongCount, 0),
      or(isNull(mistakeStates.clearedAt), gt(mistakeStates.lastWrongAt, mistakeStates.clearedAt)),
    ),
    columns: { questionId: true },
  });
  return Boolean(row);
}

/** Re-test a reading/listening/exam mistake; a correct answer clears it. */
export async function retestMistakeForUser(userId: string, input: unknown): Promise<RetestResult> {
  const { kind, refId, questionId, chosenIndex } = RetestSchema.parse(input);

  let questions: McqQuestion[] | undefined;
  let track: Track | undefined;
  if (kind === "reading" || kind === "listening") {
    const exercise =
      kind === "reading"
        ? await db.query.readingExercises.findFirst({ where: eq(readingExercises.id, refId) })
        : await db.query.listeningExercises.findFirst({ where: eq(listeningExercises.id, refId) });
    questions = exercise?.questions;
    track = exercise?.track;
  } else {
    const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, refId) });
    questions = exam?.sections.flatMap((s) => s.groups).flatMap((g) => g.questions);
    track = exam?.track;
  }
  const question = questions?.find((q) => q.id === questionId);
  if (!question) throw new NotFoundError(`Unknown ${kind} question: ${refId}/${questionId}`);

  if (!(await isActiveMistake(userId, kind, refId, questionId))) {
    throw new IntegrityError(`Not an active mistake: ${kind}/${refId}/${questionId}`);
  }

  const correct = chosenIndex === question.correctIndex;
  if (correct) {
    await db.transaction(async (tx) => {
      await upsertClear(tx, userId, kind, refId, questionId);
      if (!track) throw new NotFoundError(`Unknown ${kind} source: ${refId}`);
      await clearMistakeState(tx, { userId, track, kind, refId, questionId });
      await recordActivityWith(tx, userId);
    });
  } else {
    await recordActivity(userId);
  }

  // The answer key ships only after an answer, mirroring submitExerciseAttempt.
  return { correct, correctIndex: question.correctIndex, explanationZh: question.explanationZh };
}
