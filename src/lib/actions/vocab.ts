"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "../auth/session";
import { db } from "../db";
import { exerciseAttempts, reviewLogs, srsCards, vocabWords } from "../db/schema";
import { NEW_CARD_STATE, scheduleReview, type ReviewGrade } from "../srs";
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

  // Cards are created lazily on first review.
  let card = await db.query.srsCards.findFirst({
    where: and(eq(srsCards.userId, user.id), eq(srsCards.wordId, wordId)),
  });
  if (!card) {
    const [created] = await db
      .insert(srsCards)
      .values({ userId: user.id, wordId, dueAt: new Date() })
      .returning();
    card = created;
  }

  const next = scheduleReview(
    {
      easeFactor: card.easeFactor,
      intervalDays: card.intervalDays,
      repetitions: card.repetitions,
      lapses: card.lapses,
    },
    grade,
  );

  await db
    .update(srsCards)
    .set({
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
      dueAt: next.dueAt,
      lastReviewedAt: new Date(),
    })
    .where(eq(srsCards.id, card.id));

  await db.insert(reviewLogs).values({
    userId: user.id,
    cardId: card.id,
    grade,
    previousIntervalDays: card.intervalDays,
    newIntervalDays: next.intervalDays,
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
