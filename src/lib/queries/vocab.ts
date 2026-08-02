import { and, asc, eq, lte, notExists, sql } from "drizzle-orm";
import type { Track } from "../../content/types";
import { composeAudioUrl } from "../audio-url";
import { db } from "../db";
import { srsCards, vocabWords } from "../db/schema";
import { NEW_CARD_STATE } from "../srs";

export const MAX_DUE_PER_SESSION = 30;
export const MAX_NEW_PER_SESSION = 10;

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

/**
 * Due cards (oldest first) topped up with unseen words, for a study session.
 *
 * The two halves filter independently: the web (ADR 0029) reviews due cards
 * across every track, and its unfiltered new-word top-up serves the goal
 * pack first via `newPriorityTrack`, spilling over to the other packs only
 * once the goal pack is exhausted — without the priority, the top-up would
 * follow raw seed order across tracks. Passing one track for both halves
 * preserves the v1 `?track=` contract (priority is moot when filtered).
 */
export async function getStudyQueue(
  userId: string,
  {
    dueTrack,
    newTrack,
    newPriorityTrack,
  }: { dueTrack: Track | null; newTrack: Track | null; newPriorityTrack?: Track },
) {
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
          dueTrack ? eq(vocabWords.track, dueTrack) : undefined,
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
          newTrack ? eq(vocabWords.track, newTrack) : undefined,
          notExists(
            db
              .select({ wordId: srsCards.wordId })
              .from(srsCards)
              .where(and(eq(srsCards.userId, userId), eq(srsCards.wordId, vocabWords.id))),
          ),
        ),
      )
      .orderBy(
        ...(newPriorityTrack
          ? [sql`case when ${vocabWords.track} = ${newPriorityTrack} then 0 else 1 end`]
          : []),
        asc(vocabWords.sortOrder),
      )
      .limit(MAX_NEW_PER_SESSION),
  ]);

  // Each card carries its scheduler state — pinned in the v1 contract for
  // clients that want to surface it (the web UI deliberately doesn't).
  // audioUrl (headword pronunciation, ADR 0023) composes the Blob origin.
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
