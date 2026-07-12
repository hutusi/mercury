import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { TrackSchema } from "../../content/types";
import { db } from "../db";
import { activityDays, exerciseAttempts, reviewLogs, srsCards, vocabWords } from "../db/schema";
import { scheduleReview } from "../srs";
import { localDay, recordActivity } from "../streak";
import { NotFoundError } from "./errors";
import { recordSkillSignalSafely } from "./profile";

export const GradeCardSchema = z.object({
  wordId: z.string(),
  grade: z.union([z.literal(1), z.literal(3), z.literal(4), z.literal(5)]),
});

/** SRS-grade a flashcard: lazy card create + schedule + review log, in one transaction. */
export async function gradeCardForUser(
  userId: string,
  input: unknown,
): Promise<{ intervalDays: number }> {
  const { wordId, grade } = GradeCardSchema.parse(input);

  const word = await db.query.vocabWords.findFirst({ where: eq(vocabWords.id, wordId) });
  if (!word) throw new NotFoundError(`Unknown word: ${wordId}`);

  const now = new Date();

  // A first review creates the card lazily. Upsert-then-reselect (rather than
  // read-then-insert) so two concurrent first-reviews of the same word can't
  // both insert and trip the unique(userId, wordId) index. The upsert, the
  // scheduler update, the review-log insert, and the activity record all run in
  // one transaction: a mid-sequence failure can't leave the card advanced
  // without a matching log, and — since StudySession retries on error — the
  // grade can't commit and then fail afterward, which would double-advance the
  // card on retry. Postgres transactions are async, hence the awaited
  // statements and `.limit(1)` reselect (pg-core has no `.get()` terminal).
  const next = await db.transaction(async (tx) => {
    await tx.insert(srsCards).values({ userId, wordId, dueAt: now }).onConflictDoNothing();

    const [card] = await tx
      .select()
      .from(srsCards)
      .where(and(eq(srsCards.userId, userId), eq(srsCards.wordId, wordId)))
      .limit(1);
    if (!card) throw new Error(`Failed to load SRS card for word: ${wordId}`);

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

    await tx.insert(reviewLogs).values({
      userId,
      cardId: card.id,
      grade,
      previousIntervalDays: card.intervalDays,
      newIntervalDays: scheduled.intervalDays,
    });

    await tx.insert(activityDays).values({ userId, day: localDay() }).onConflictDoNothing();

    return scheduled;
  });

  return { intervalDays: next.intervalDays };
}

export const QuizSubmitSchema = z.object({
  track: TrackSchema,
  /** questionWordId -> chosen option's wordId */
  answers: z.record(z.string(), z.string()).refine((r) => Object.keys(r).length <= 20),
});

/** Score a vocab quiz by word-id equality and persist it as an exercise attempt. */
export async function submitQuizForUser(
  userId: string,
  input: unknown,
): Promise<{ score: number; total: number; correctWordIds: string[] }> {
  const { track, answers } = QuizSubmitSchema.parse(input);

  const entries = Object.entries(answers);
  const correctWordIds = entries.filter(([wordId, chosen]) => wordId === chosen).map(([w]) => w);
  const score = correctWordIds.length;
  const total = entries.length;

  const answerMap: Record<string, number> = {};
  for (const [wordId, chosen] of entries) answerMap[wordId] = wordId === chosen ? 1 : 0;

  await db.insert(exerciseAttempts).values({
    userId,
    kind: "vocab_quiz",
    refId: `quiz-${track}`,
    track,
    answers: answerMap,
    score,
    total,
    durationSeconds: 0,
  });
  await recordActivity(userId);
  // The quiz (not per-card SRS grades, which are too noisy and run inside a
  // transaction) is the vocab accuracy signal for the learner model.
  if (total > 0) {
    await recordSkillSignalSafely(userId, {
      skill: "vocab",
      value: (score / total) * 100,
      source: "exercise",
    });
  }

  return { score, total, correctWordIds };
}
