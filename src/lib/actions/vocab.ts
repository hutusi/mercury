"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "../auth/session";
import { db } from "../db";
import { exerciseAttempts, reviewLogs, srsCards, vocabWords } from "../db/schema";
import { scheduleReview, type ReviewGrade } from "../srs";
import { recordActivity } from "../streak";
import { TrackSchema } from "../../content/types";

const GradeSchema = z.object({
  wordId: z.string(),
  grade: z.union([z.literal(1), z.literal(3), z.literal(4), z.literal(5)]),
});

export async function gradeCard(input: {
  wordId: string;
  grade: ReviewGrade;
}): Promise<{ intervalDays: number }> {
  const user = await requireUser();
  const { wordId, grade } = GradeSchema.parse(input);

  const word = await db.query.vocabWords.findFirst({ where: eq(vocabWords.id, wordId) });
  if (!word) throw new Error(`Unknown word: ${wordId}`);

  const now = new Date();

  // A first review creates the card lazily. Upsert-then-reselect (rather than
  // read-then-insert) so two concurrent first-reviews of the same word can't
  // both insert and trip the unique(userId, wordId) index. The upsert, the
  // scheduler update, and the review-log insert run in one transaction, so a
  // mid-sequence failure can't leave the card advanced without a matching log.
  // better-sqlite3 transactions are synchronous — hence the .run()/.get()
  // terminals and no await inside the callback.
  const next = db.transaction((tx) => {
    tx.insert(srsCards).values({ userId: user.id, wordId, dueAt: now }).onConflictDoNothing().run();

    const card = tx
      .select()
      .from(srsCards)
      .where(and(eq(srsCards.userId, user.id), eq(srsCards.wordId, wordId)))
      .get();
    if (!card) throw new Error(`Failed to load SRS card for word: ${wordId}`);

    const scheduled = scheduleReview(
      {
        easeFactor: card.easeFactor,
        intervalDays: card.intervalDays,
        repetitions: card.repetitions,
        lapses: card.lapses,
      },
      grade,
    );

    tx.update(srsCards)
      .set({
        easeFactor: scheduled.easeFactor,
        intervalDays: scheduled.intervalDays,
        repetitions: scheduled.repetitions,
        lapses: scheduled.lapses,
        dueAt: scheduled.dueAt,
        lastReviewedAt: now,
      })
      .where(eq(srsCards.id, card.id))
      .run();

    tx.insert(reviewLogs)
      .values({
        userId: user.id,
        cardId: card.id,
        grade,
        previousIntervalDays: card.intervalDays,
        newIntervalDays: scheduled.intervalDays,
      })
      .run();

    return scheduled;
  });

  await recordActivity(user.id);

  return { intervalDays: next.intervalDays };
}

const QuizSubmitSchema = z.object({
  track: TrackSchema,
  /** questionWordId -> chosen option's wordId */
  answers: z.record(z.string(), z.string()).refine((r) => Object.keys(r).length <= 20),
});

export async function submitQuiz(input: {
  track: string;
  answers: Record<string, string>;
}): Promise<{ score: number; total: number; correctWordIds: string[] }> {
  const user = await requireUser();
  const { track, answers } = QuizSubmitSchema.parse(input);

  const entries = Object.entries(answers);
  const correctWordIds = entries.filter(([wordId, chosen]) => wordId === chosen).map(([w]) => w);
  const score = correctWordIds.length;
  const total = entries.length;

  const answerMap: Record<string, number> = {};
  for (const [wordId, chosen] of entries) answerMap[wordId] = wordId === chosen ? 1 : 0;

  await db.insert(exerciseAttempts).values({
    userId: user.id,
    kind: "vocab_quiz",
    refId: `quiz-${track}`,
    track,
    answers: answerMap,
    score,
    total,
    durationSeconds: 0,
  });
  await recordActivity(user.id);

  return { score, total, correctWordIds };
}
