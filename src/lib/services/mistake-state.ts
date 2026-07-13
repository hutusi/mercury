import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Track } from "../../content/types";
import type { DbExecutor } from "../db";
import { mistakeStates } from "../db/schema";
import type { MistakeKind } from "../mistakes-core";

export interface MistakeOutcome {
  questionId: string;
  correct: boolean;
}

export interface RecordMistakeOutcomesInput {
  userId: string;
  track: Track;
  kind: MistakeKind;
  refId: string;
  outcomes: readonly MistakeOutcome[];
  occurredAt?: Date;
}

/**
 * Maintain the mistakes read model from a trusted grading result. Wrong
 * outcomes increment history and may revive a row; correct-only outcomes
 * persist hidden tombstones. Timestamp comparison plus conflict upserts make
 * concurrent commits order-independent.
 */
export async function recordMistakeOutcomes(
  executor: DbExecutor,
  input: RecordMistakeOutcomesInput,
): Promise<void> {
  const occurredAt = input.occurredAt ?? new Date();
  for (const outcome of input.outcomes) {
    if (outcome.correct) {
      await executor
        .insert(mistakeStates)
        .values({
          userId: input.userId,
          track: input.track,
          kind: input.kind,
          refId: input.refId,
          questionId: outcome.questionId,
          wrongCount: 0,
          lastWrongAt: null,
          clearedAt: occurredAt,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            mistakeStates.userId,
            mistakeStates.kind,
            mistakeStates.refId,
            mistakeStates.questionId,
          ],
          set: {
            track: input.track,
            clearedAt: sql`greatest(coalesce(${mistakeStates.clearedAt}, '-infinity'::timestamptz), ${occurredAt})`,
            updatedAt: new Date(),
          },
        });
      continue;
    }

    await executor
      .insert(mistakeStates)
      .values({
        userId: input.userId,
        track: input.track,
        kind: input.kind,
        refId: input.refId,
        questionId: outcome.questionId,
        wrongCount: 1,
        lastWrongAt: occurredAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          mistakeStates.userId,
          mistakeStates.kind,
          mistakeStates.refId,
          mistakeStates.questionId,
        ],
        set: {
          track: input.track,
          wrongCount: sql`${mistakeStates.wrongCount} + 1`,
          lastWrongAt: sql`greatest(coalesce(${mistakeStates.lastWrongAt}, '-infinity'::timestamptz), ${occurredAt})`,
          updatedAt: new Date(),
        },
      });
  }
}

/** Clear only the active mistake generation a notebook re-test authorized. */
export async function clearMistakeGeneration(
  executor: DbExecutor,
  input: Omit<RecordMistakeOutcomesInput, "outcomes" | "occurredAt"> & {
    questionId: string;
    expectedLastWrongAt: Date;
    clearedAt?: Date;
  },
): Promise<boolean> {
  const clearedAt = input.clearedAt ?? new Date();
  const [cleared] = await executor
    .update(mistakeStates)
    .set({
      clearedAt: sql`greatest(coalesce(${mistakeStates.clearedAt}, '-infinity'::timestamptz), ${clearedAt})`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mistakeStates.userId, input.userId),
        eq(mistakeStates.kind, input.kind),
        eq(mistakeStates.refId, input.refId),
        eq(mistakeStates.questionId, input.questionId),
        eq(mistakeStates.lastWrongAt, input.expectedLastWrongAt),
        or(isNull(mistakeStates.clearedAt), gt(mistakeStates.lastWrongAt, mistakeStates.clearedAt)),
      ),
    )
    .returning({ questionId: mistakeStates.questionId });
  return Boolean(cleared);
}

/** Resolve one active notebook item without incrementing attempt history. */
export async function clearMistakeState(
  executor: DbExecutor,
  input: Omit<RecordMistakeOutcomesInput, "outcomes"> & { questionId: string },
): Promise<void> {
  await recordMistakeOutcomes(executor, {
    ...input,
    outcomes: [{ questionId: input.questionId, correct: true }],
  });
}
