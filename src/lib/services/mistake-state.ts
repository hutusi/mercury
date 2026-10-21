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
  /** Null for track-agnostic sources (books). */
  track: Track | null;
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
 *
 * Two multi-row statements regardless of question count: an exam submit
 * grades ~50 questions while holding the attempt row lock, and one upsert per
 * question made that 50 serial round-trips. Postgres rejects affecting the
 * same row twice in one statement, so outcomes are folded per question first:
 * any correct outcome lands in the clear statement, wrong outcomes add up.
 * Applying clears before wrongs reproduces the per-outcome loop's final state
 * for every ordering (both stamp the same occurredAt).
 */
export async function recordMistakeOutcomes(
  executor: DbExecutor,
  input: RecordMistakeOutcomesInput,
): Promise<void> {
  const occurredAt = input.occurredAt ?? new Date();
  const updatedAt = new Date();
  const correctIds = new Set<string>();
  const wrongCounts = new Map<string, number>();
  for (const outcome of input.outcomes) {
    if (outcome.correct) correctIds.add(outcome.questionId);
    else wrongCounts.set(outcome.questionId, (wrongCounts.get(outcome.questionId) ?? 0) + 1);
  }
  const target = [
    mistakeStates.userId,
    mistakeStates.kind,
    mistakeStates.refId,
    mistakeStates.questionId,
  ];

  if (correctIds.size > 0) {
    await executor
      .insert(mistakeStates)
      .values(
        [...correctIds].map((questionId) => ({
          userId: input.userId,
          track: input.track,
          kind: input.kind,
          refId: input.refId,
          questionId,
          wrongCount: 0,
          lastWrongAt: null,
          clearedAt: occurredAt,
          updatedAt,
        })),
      )
      .onConflictDoUpdate({
        target,
        set: {
          track: input.track,
          clearedAt: sql`greatest(coalesce(${mistakeStates.clearedAt}, '-infinity'::timestamptz), excluded.cleared_at)`,
          updatedAt,
        },
      });
  }

  if (wrongCounts.size > 0) {
    await executor
      .insert(mistakeStates)
      .values(
        [...wrongCounts].map(([questionId, wrongCount]) => ({
          userId: input.userId,
          track: input.track,
          kind: input.kind,
          refId: input.refId,
          questionId,
          wrongCount,
          lastWrongAt: occurredAt,
          updatedAt,
        })),
      )
      .onConflictDoUpdate({
        target,
        set: {
          track: input.track,
          wrongCount: sql`${mistakeStates.wrongCount} + excluded.wrong_count`,
          lastWrongAt: sql`greatest(coalesce(${mistakeStates.lastWrongAt}, '-infinity'::timestamptz), excluded.last_wrong_at)`,
          updatedAt,
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
