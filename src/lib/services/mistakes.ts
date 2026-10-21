import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { McqQuestion, Track } from "@/content/types";
import { db, type DbExecutor } from "../db";
import {
  bookChapters,
  listeningExercises,
  mistakeClears,
  mockExams,
  mistakeStates,
  readingExercises,
} from "../db/schema";
import type { MistakeKind } from "../mistakes-core";
import { recordActivityWith } from "../streak";
import { IntegrityError, NotFoundError } from "./errors";
import { clearMistakeGeneration } from "./mistake-state";

export const RetestSchema = z.object({
  kind: z.enum(["reading", "listening", "exam", "book_quiz"]),
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
 *  so re-clearing a revived mistake outweighs the newer wrong answer — never
 *  moving it backwards if instance clocks disagree. */
async function upsertClear(
  executor: DbExecutor,
  userId: string,
  kind: MistakeKind,
  refId: string,
  questionId: string,
  clearedAt: Date,
) {
  await executor
    .insert(mistakeClears)
    .values({ userId, kind, refId, questionId, clearedAt })
    .onConflictDoUpdate({
      target: [
        mistakeClears.userId,
        mistakeClears.kind,
        mistakeClears.refId,
        mistakeClears.questionId,
      ],
      set: { clearedAt: sql`greatest(${mistakeClears.clearedAt}, ${clearedAt})` },
    });
}

/**
 * Lock the caller's ACTIVE mistake row and return its generation (its
 * lastWrongAt), or null. The question must be an active mistake: without
 * this check, a user mid-exam could call the mutation directly and extract
 * the answer key for questions they've never answered. The row lock makes a
 * concurrent attempt on the same question wait, so the check and the clear
 * see one state.
 */
async function lockActiveMistake(
  executor: DbExecutor,
  userId: string,
  kind: "reading" | "listening" | "exam" | "book_quiz",
  refId: string,
  questionId: string,
): Promise<Date | null> {
  const [row] = await executor
    .select({ lastWrongAt: mistakeStates.lastWrongAt })
    .from(mistakeStates)
    .where(
      and(
        eq(mistakeStates.userId, userId),
        eq(mistakeStates.kind, kind),
        eq(mistakeStates.refId, refId),
        eq(mistakeStates.questionId, questionId),
        gt(mistakeStates.wrongCount, 0),
        or(isNull(mistakeStates.clearedAt), gt(mistakeStates.lastWrongAt, mistakeStates.clearedAt)),
      ),
    )
    .for("update");
  return row?.lastWrongAt ?? null;
}

/** Re-test a reading/listening/exam/book mistake; a correct answer clears it. */
export async function retestMistakeForUser(userId: string, input: unknown): Promise<RetestResult> {
  const { kind, refId, questionId, chosenIndex } = RetestSchema.parse(input);

  let questions: McqQuestion[] | undefined;
  // Null = track-agnostic source (books); undefined = source not found.
  let track: Track | null | undefined;
  if (kind === "reading" || kind === "listening") {
    const exercise =
      kind === "reading"
        ? await db.query.readingExercises.findFirst({ where: eq(readingExercises.id, refId) })
        : await db.query.listeningExercises.findFirst({ where: eq(listeningExercises.id, refId) });
    questions = exercise?.questions;
    track = exercise?.track;
  } else if (kind === "book_quiz") {
    // Only the end-of-chapter quiz: check-ins are never recorded as
    // mistakes, so they can never be retested (or leak keys) here.
    const chapter = await db.query.bookChapters.findFirst({
      columns: { quiz: true },
      where: eq(bookChapters.id, refId),
    });
    questions = chapter?.quiz;
    track = chapter ? null : undefined;
  } else {
    const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, refId) });
    questions = exam?.sections.flatMap((s) => s.groups).flatMap((g) => g.questions);
    track = exam?.track;
  }
  const question = questions?.find((q) => q.id === questionId);
  if (!question) throw new NotFoundError(`Unknown ${kind} question: ${refId}/${questionId}`);
  if (track === undefined) throw new NotFoundError(`Unknown ${kind} source: ${refId}`);
  const sourceTrack = track;

  const correct = chosenIndex === question.correctIndex;
  // Check and clear in one transaction under the row lock. Clearing by
  // generation (compare-and-set on lastWrongAt) means a wrong answer that
  // commits between the learner opening the item and answering is never
  // silently cleared by this retest.
  await db.transaction(async (tx) => {
    const generation = await lockActiveMistake(tx, userId, kind, refId, questionId);
    if (!generation) {
      throw new IntegrityError(`Not an active mistake: ${kind}/${refId}/${questionId}`);
    }
    if (correct) {
      const clearedAt = new Date();
      const cleared = await clearMistakeGeneration(tx, {
        userId,
        track: sourceTrack,
        kind,
        refId,
        questionId,
        expectedLastWrongAt: generation,
        clearedAt,
      });
      if (cleared) await upsertClear(tx, userId, kind, refId, questionId, clearedAt);
    }
    await recordActivityWith(tx, userId);
  });

  // The answer key ships only after an answer, mirroring submitExerciseAttempt.
  return { correct, correctIndex: question.correctIndex, explanationZh: question.explanationZh };
}
