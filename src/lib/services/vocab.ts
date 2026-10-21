import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { isUniqueViolation } from "../db/pg-errors";
import { reviewLogs, srsCards, vocabWords } from "../db/schema";
import {
  reviewTimestamp,
  scheduleReview,
  undoDecision,
  type ReviewGrade,
  type SrsState,
} from "../srs";
import { recordActivityWith } from "../streak";
import { ConflictError, ExpiredError, NotFoundError } from "./errors";

export const GradeCardSchema = z.object({
  wordId: z.string(),
  grade: z.union([z.literal(1), z.literal(3), z.literal(4), z.literal(5)]),
  /**
   * Client idempotency key (ADR 0031). Optional so v1 native clients keep
   * working; the web client always sends one per queue position.
   */
  requestId: z.string().uuid().optional(),
});

export interface GradeCardResult {
  /** The review log row — the handle a later undo refers to. */
  reviewId: string;
  /** The grade that was recorded. On a replay this is the ORIGINAL grade. */
  grade: ReviewGrade;
  /** True when this request id had already been graded (nothing re-applied). */
  replayed: boolean;
  intervalDays: number;
  srs: SrsState;
}

type ReviewLogRow = typeof reviewLogs.$inferSelect;

/**
 * Recompute the result a logged review originally returned. scheduleReview
 * is deterministic, so the stored pre-review snapshot plus the grade and its
 * timestamp reproduce it exactly — no post-state columns needed.
 */
function replayResult(log: ReviewLogRow): GradeCardResult {
  if (log.prevEaseFactor === null || log.prevRepetitions === null || log.prevLapses === null) {
    // Only rows written with a request id are ever replayed, and those always
    // carry the snapshot (enforced by review_logs_prev_state_check).
    throw new Error(`Review ${log.id} has no pre-review snapshot to replay`);
  }
  const grade = log.grade as ReviewGrade;
  const next = scheduleReview(
    {
      easeFactor: log.prevEaseFactor,
      intervalDays: log.previousIntervalDays,
      repetitions: log.prevRepetitions,
      lapses: log.prevLapses,
    },
    grade,
    log.reviewedAt,
  );
  return {
    reviewId: log.id,
    grade,
    replayed: true,
    intervalDays: next.intervalDays,
    srs: {
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
    },
  };
}

async function findPriorReview(
  executor: Pick<typeof db, "select">,
  userId: string,
  requestId: string,
): Promise<ReviewLogRow | undefined> {
  const [prior] = await executor
    .select()
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, userId), eq(reviewLogs.requestId, requestId)))
    .limit(1);
  return prior;
}

/**
 * SRS-grade a flashcard: lazy card create + schedule + review log, in one
 * transaction, idempotent per client request id.
 */
export async function gradeCardForUser(userId: string, input: unknown): Promise<GradeCardResult> {
  const { wordId, grade, requestId } = GradeCardSchema.parse(input);

  const word = await db.query.vocabWords.findFirst({
    columns: { id: true },
    where: eq(vocabWords.id, wordId),
  });
  if (!word) throw new NotFoundError(`Unknown word: ${wordId}`);

  try {
    return await gradeInTransaction(userId, wordId, grade, requestId);
  } catch (err) {
    // Last barrier: the card lock already serializes same-word retries, so a
    // duplicate key here means a concurrent twin committed first. Resolve it
    // exactly like the in-transaction replay check would have.
    if (!requestId || !isUniqueViolation(err, "review_logs_request_idx")) throw err;
    const prior = await findPriorReview(db, userId, requestId);
    if (!prior) throw err;
    return replayFor(prior, userId, wordId);
  }
}

async function replayFor(
  prior: ReviewLogRow,
  userId: string,
  wordId: string,
): Promise<GradeCardResult> {
  const [card] = await db
    .select({ wordId: srsCards.wordId })
    .from(srsCards)
    .where(and(eq(srsCards.id, prior.cardId), eq(srsCards.userId, userId)))
    .limit(1);
  if (card?.wordId !== wordId) {
    throw new ConflictError(
      "This request id was already used to grade a different word",
      "grade_request_conflict",
    );
  }
  return replayResult(prior);
}

async function gradeInTransaction(
  userId: string,
  wordId: string,
  grade: ReviewGrade,
  requestId: string | undefined,
): Promise<GradeCardResult> {
  // A first review creates the card lazily. Upsert-then-reselect (rather than
  // read-then-insert) so two concurrent first-reviews of the same word can't
  // both insert and trip the unique(userId, wordId) index. The upsert, the
  // scheduler update, the review-log insert, and the activity record all run
  // in one transaction, so a mid-sequence failure can't leave the card
  // advanced without a matching log. The request id makes the whole grade
  // idempotent: a retry after a lost response (the server committed, the
  // client never heard) replays the stored review instead of advancing the
  // card a second time.
  return db.transaction(async (tx) => {
    const created = await tx
      .insert(srsCards)
      .values({ userId, wordId, dueAt: new Date() })
      .onConflictDoNothing()
      .returning({ id: srsCards.id });

    const [card] = await tx
      .select()
      .from(srsCards)
      .where(and(eq(srsCards.userId, userId), eq(srsCards.wordId, wordId)))
      .for("update")
      .limit(1);
    if (!card) throw new Error(`Failed to load SRS card for word: ${wordId}`);

    // Checked AFTER the card lock: a concurrent retry of the same request
    // waits on the lock, then sees the committed log here.
    if (requestId) {
      const prior = await findPriorReview(tx, userId, requestId);
      if (prior) {
        if (prior.cardId !== card.id) {
          throw new ConflictError(
            "This request id was already used to grade a different word",
            "grade_request_conflict",
          );
        }
        return replayResult(prior);
      }
    }

    // Read under the lock and kept past the previous review, so concurrent
    // grades of one card are timestamped in the order they were applied.
    const now = reviewTimestamp(new Date(), card.lastReviewedAt);
    const scheduled = scheduleReview(
      {
        easeFactor: card.easeFactor,
        intervalDays: card.intervalDays,
        repetitions: card.repetitions,
        lapses: card.lapses,
      },
      grade,
      now,
    );

    await tx
      .update(srsCards)
      .set({
        easeFactor: scheduled.easeFactor,
        intervalDays: scheduled.intervalDays,
        repetitions: scheduled.repetitions,
        lapses: scheduled.lapses,
        dueAt: scheduled.dueAt,
        lastReviewedAt: now,
      })
      .where(eq(srsCards.id, card.id));

    const [log] = await tx
      .insert(reviewLogs)
      .values({
        userId,
        cardId: card.id,
        grade,
        previousIntervalDays: card.intervalDays,
        newIntervalDays: scheduled.intervalDays,
        // Same clock read as lastReviewedAt: replay recomputes from it, and
        // "is this the card's latest review" comparisons rely on it.
        reviewedAt: now,
        requestId,
        prevEaseFactor: card.easeFactor,
        prevRepetitions: card.repetitions,
        prevLapses: card.lapses,
        prevDueAt: card.dueAt,
        prevLastReviewedAt: card.lastReviewedAt,
        createdCard: created.length > 0,
      })
      .returning({ id: reviewLogs.id });

    await recordActivityWith(tx, userId);

    // The post-review state lets the client keep a re-queued lapse's
    // scheduler state truthful without refetching the study queue.
    return {
      reviewId: log.id,
      grade,
      replayed: false,
      intervalDays: scheduled.intervalDays,
      srs: {
        easeFactor: scheduled.easeFactor,
        intervalDays: scheduled.intervalDays,
        repetitions: scheduled.repetitions,
        lapses: scheduled.lapses,
      },
    };
  });
}

export const UndoGradeSchema = z.object({ reviewId: z.string().min(1) });

export interface UndoGradeResult {
  wordId: string;
  /** The undone review had created the card: the word is new again. */
  restoredToNew: boolean;
  /** The card's restored scheduler state (null when it was deleted). */
  srs: SrsState | null;
}

/**
 * Undo a grade (ADR 0031): restore the card to its pre-review snapshot and
 * delete the review log — or, if that review lazily created the card, delete
 * the card so the word is unseen again. Only the card's latest review, only
 * within the undo window. activity_days is left alone: the learner did study
 * today, and the streak should not flicker with an undo.
 */
export async function undoGradeForUser(userId: string, input: unknown): Promise<UndoGradeResult> {
  const { reviewId } = UndoGradeSchema.parse(input);
  return db.transaction(async (tx) => {
    const [log] = await tx
      .select()
      .from(reviewLogs)
      .where(and(eq(reviewLogs.id, reviewId), eq(reviewLogs.userId, userId)))
      .for("update")
      .limit(1);
    if (!log) throw new NotFoundError(`Unknown review: ${reviewId}`);

    const [card] = await tx
      .select()
      .from(srsCards)
      .where(and(eq(srsCards.id, log.cardId), eq(srsCards.userId, userId)))
      .for("update")
      .limit(1);
    if (!card) throw new NotFoundError(`Unknown review: ${reviewId}`);

    const [latest] = await tx
      .select({ id: reviewLogs.id })
      .from(reviewLogs)
      .where(eq(reviewLogs.cardId, card.id))
      .orderBy(desc(reviewLogs.reviewedAt), desc(reviewLogs.id))
      .limit(1);

    const hasSnapshot =
      log.prevEaseFactor !== null &&
      log.prevRepetitions !== null &&
      log.prevLapses !== null &&
      log.prevDueAt !== null;
    const decision = undoDecision(
      { id: log.id, reviewedAt: log.reviewedAt, hasSnapshot },
      latest?.id ?? null,
      new Date(),
    );
    if (decision === "expired") {
      throw new ExpiredError("The undo window has passed", "undo_expired");
    }
    if (decision === "superseded") {
      throw new ConflictError("A later review has built on this one", "undo_superseded");
    }
    if (decision === "unavailable") {
      throw new ConflictError("This review predates undo support", "undo_unavailable");
    }

    if (log.createdCard) {
      // Cascades to the review log.
      await tx.delete(srsCards).where(eq(srsCards.id, card.id));
      return { wordId: card.wordId, restoredToNew: true, srs: null };
    }

    const restored: SrsState = {
      easeFactor: log.prevEaseFactor!,
      intervalDays: log.previousIntervalDays,
      repetitions: log.prevRepetitions!,
      lapses: log.prevLapses!,
    };
    await tx
      .update(srsCards)
      .set({
        ...restored,
        dueAt: log.prevDueAt!,
        lastReviewedAt: log.prevLastReviewedAt,
      })
      .where(eq(srsCards.id, card.id));
    await tx.delete(reviewLogs).where(eq(reviewLogs.id, log.id));
    return { wordId: card.wordId, restoredToNew: false, srs: restored };
  });
}
