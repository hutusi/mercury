import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { reviewLogs, srsCards, vocabWords } from "../db/schema";
import { scheduleReview, type ReviewGrade, type SrsState } from "../srs";
import { recordActivityWith } from "../streak";
import { ConflictError, NotFoundError } from "./errors";

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

/** A unique violation on the (user, request_id) idempotency index. */
function isRequestIdConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23505" &&
    (error as { constraint?: unknown }).constraint === "review_logs_request_idx"
  );
}

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
    if (!requestId || !isRequestIdConflict(err)) throw err;
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
  const now = new Date();

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
      .values({ userId, wordId, dueAt: now })
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
