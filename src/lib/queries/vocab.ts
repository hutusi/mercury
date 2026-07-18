import { and, asc, eq, lte, notExists } from "drizzle-orm";
import type { Track } from "../../content/types";
import { composeAudioUrl } from "../audio-url";
import { db } from "../db";
import { srsCards, vocabWords } from "../db/schema";
import { NEW_CARD_STATE } from "../srs";

const MAX_DUE_PER_SESSION = 30;
const MAX_NEW_PER_SESSION = 10;

/** Word list (one track, or all when null) plus per-user SRS aggregates for the overview. */
export async function getVocabOverview(userId: string, track: Track | null) {
  const [words, cards] = await Promise.all([
    db.query.vocabWords.findMany({
      where: track ? eq(vocabWords.track, track) : undefined,
      orderBy: vocabWords.sortOrder,
    }),
    db
      .select({ wordId: srsCards.wordId, dueAt: srsCards.dueAt })
      .from(srsCards)
      .innerJoin(vocabWords, eq(srsCards.wordId, vocabWords.id))
      .where(and(eq(srsCards.userId, userId), track ? eq(vocabWords.track, track) : undefined)),
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
export async function getStudyQueue(userId: string, track: Track | null) {
  const [dueRows, newRows] = await Promise.all([
    db
      .select({
        word: vocabWords,
        easeFactor: srsCards.easeFactor,
        intervalDays: srsCards.intervalDays,
        repetitions: srsCards.repetitions,
        lapses: srsCards.lapses,
      })
      .from(srsCards)
      .innerJoin(vocabWords, eq(srsCards.wordId, vocabWords.id))
      .where(
        and(
          eq(srsCards.userId, userId),
          track ? eq(vocabWords.track, track) : undefined,
          lte(srsCards.dueAt, new Date()),
        ),
      )
      .orderBy(asc(srsCards.dueAt))
      .limit(MAX_DUE_PER_SESSION),
    db
      .select({ word: vocabWords })
      .from(vocabWords)
      .where(
        and(
          track ? eq(vocabWords.track, track) : undefined,
          notExists(
            db
              .select({ wordId: srsCards.wordId })
              .from(srsCards)
              .where(and(eq(srsCards.userId, userId), eq(srsCards.wordId, vocabWords.id))),
          ),
        ),
      )
      .orderBy(asc(vocabWords.sortOrder))
      .limit(MAX_NEW_PER_SESSION),
  ]);

  // Each card carries its scheduler state so clients can preview what every
  // grade would do (interval hints) with the same pure SM-2 rules. audioUrl
  // (headword pronunciation, ADR 0023) is composed against the Blob origin.
  return [
    ...dueRows.map(({ word, easeFactor, intervalDays, repetitions, lapses }) => ({
      ...word,
      wordId: word.id,
      audioUrl: composeAudioUrl(word.audioUrl),
      isNew: false,
      srs: { easeFactor, intervalDays, repetitions, lapses },
    })),
    ...newRows.map(({ word }) => ({
      ...word,
      wordId: word.id,
      audioUrl: composeAudioUrl(word.audioUrl),
      isNew: true,
      srs: NEW_CARD_STATE,
    })),
  ];
}
