import { and, eq, sql } from "drizzle-orm";
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
 * outcomes increment history and may revive a row; correct outcomes resolve
 * only an existing row. Timestamp comparison makes concurrent commits
 * order-independent.
 */
export async function recordMistakeOutcomes(
  executor: DbExecutor,
  input: RecordMistakeOutcomesInput,
): Promise<void> {
  const occurredAt = input.occurredAt ?? new Date();
  for (const outcome of input.outcomes) {
    const key = and(
      eq(mistakeStates.userId, input.userId),
      eq(mistakeStates.kind, input.kind),
      eq(mistakeStates.refId, input.refId),
      eq(mistakeStates.questionId, outcome.questionId),
    );

    if (outcome.correct) {
      await executor
        .update(mistakeStates)
        .set({
          clearedAt: sql`greatest(coalesce(${mistakeStates.clearedAt}, '-infinity'::timestamptz), ${occurredAt})`,
          updatedAt: new Date(),
        })
        .where(key);
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
          lastWrongAt: sql`greatest(${mistakeStates.lastWrongAt}, ${occurredAt})`,
          updatedAt: new Date(),
        },
      });
  }
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
