import { and, asc, eq, lte, sql } from "drizzle-orm";
import type { Track } from "../../content/types";
import { db } from "../db";
import { srsCards, vocabWords } from "../db/schema";
import { buildQuizQuestion, type QuizQuestion } from "../vocab-quiz-core";

const MAX_DUE_PER_SESSION = 30;
const MAX_NEW_PER_SESSION = 10;
const QUIZ_SIZE = 10;

/** Word list plus per-user SRS aggregates for the vocabulary overview. */
export async function getVocabOverview(userId: string, track: Track) {
  const [words, cards] = await Promise.all([
    db.query.vocabWords.findMany({
      where: eq(vocabWords.track, track),
      orderBy: vocabWords.sortOrder,
    }),
    db
      .select({ wordId: srsCards.wordId, dueAt: srsCards.dueAt })
      .from(srsCards)
      .innerJoin(vocabWords, eq(srsCards.wordId, vocabWords.id))
      .where(and(eq(srsCards.userId, userId), eq(vocabWords.track, track))),
  ]);

  const now = Date.now();
  const startedIds = new Set(cards.map((c) => c.wordId));
  const dueIds = new Set(cards.filter((c) => c.dueAt.getTime() <= now).map((c) => c.wordId));

  return {
    words,
    startedIds,
    dueIds,
    dueCount: dueIds.size,
    freshCount: words.length - startedIds.size,
    learnedCount: startedIds.size,
  };
}

/** Due cards (oldest first) topped up with unseen words, for a study session. */
export async function getStudyQueue(userId: string, track: Track) {
  const dueRows = await db
    .select({ word: vocabWords })
    .from(srsCards)
    .innerJoin(vocabWords, eq(srsCards.wordId, vocabWords.id))
    .where(
      and(
        eq(srsCards.userId, userId),
        eq(vocabWords.track, track),
        lte(srsCards.dueAt, new Date()),
      ),
    )
    .orderBy(asc(srsCards.dueAt))
    .limit(MAX_DUE_PER_SESSION);

  const startedRows = await db
    .select({ wordId: srsCards.wordId })
    .from(srsCards)
    .innerJoin(vocabWords, eq(srsCards.wordId, vocabWords.id))
    .where(and(eq(srsCards.userId, userId), eq(vocabWords.track, track)));
  const startedIds = new Set(startedRows.map((r) => r.wordId));

  const trackWords = await db.query.vocabWords.findMany({
    where: eq(vocabWords.track, track),
    orderBy: vocabWords.sortOrder,
  });
  const newWords = trackWords.filter((w) => !startedIds.has(w.id)).slice(0, MAX_NEW_PER_SESSION);

  return [
    ...dueRows.map(({ word }) => ({ ...word, wordId: word.id, isNew: false })),
    ...newWords.map((word) => ({ ...word, wordId: word.id, isNew: true })),
  ];
}

/** Random quiz for a track; empty when the word pool is too small for options. */
export async function buildQuiz(
  track: Track,
): Promise<{ track: Track; questions: QuizQuestion[] }> {
  const words = await db.query.vocabWords.findMany({
    where: eq(vocabWords.track, track),
    orderBy: sql`random()`,
    limit: QUIZ_SIZE + 15,
  });

  if (words.length < 4) return { track, questions: [] };

  const questions = words
    .slice(0, QUIZ_SIZE)
    .map((word, i) => buildQuizQuestion(word, words, i % 2 === 0 ? "en2zh" : "zh2en"));
  return { track, questions };
}
