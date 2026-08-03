import { and, countDistinct, desc, eq, max } from "drizzle-orm";
import {
  currentChapterId,
  deriveChapterStates,
  estimateChapterMinutes,
  sanitizeChapter,
  type ChapterState,
} from "../book-core";
import { db } from "../db";
import { bookChapters, bookQuizAttempts, books } from "../db/schema";

/**
 * Reads for the book library. Books are track-agnostic (ADR 0024) — no
 * goal-track filter applies here. Only seeded books are listed; per-user
 * (origin 'user') rows are a future BYOB concern.
 */

export async function listBooksForUser(userId: string) {
  const [rows, progress] = await Promise.all([
    db.query.books.findMany({
      where: eq(books.origin, "seeded"),
      // Ladder order (seeded from BOOK_DIRS position); id breaks ties so the
      // listing stays deterministic if sortOrder ever collides.
      orderBy: [books.sortOrder, books.id],
    }),
    db
      .select({
        bookId: bookQuizAttempts.bookId,
        completedChapters: countDistinct(bookQuizAttempts.chapterId),
        lastActivityAt: max(bookQuizAttempts.completedAt),
      })
      .from(bookQuizAttempts)
      .where(eq(bookQuizAttempts.userId, userId))
      .groupBy(bookQuizAttempts.bookId),
  ]);

  const progressByBook = new Map(progress.map((p) => [p.bookId, p]));
  return rows.map((book) => {
    const p = progressByBook.get(book.id);
    return {
      id: book.id,
      title: book.title,
      titleZh: book.titleZh,
      author: book.author,
      cefrLevel: book.cefrLevel,
      genres: book.genres,
      chapterCount: book.chapterCount,
      wordCount: book.wordCount,
      completedChapters: p?.completedChapters ?? 0,
      lastActivityAt: p?.lastActivityAt ?? null,
    };
  });
}

/** Best attempt per chapter of one book — the single derivation source for
 * completion, lock state, and best scores (there is no progress table). */
async function bestAttemptsByChapter(userId: string, bookId: string) {
  const attempts = await db
    .selectDistinctOn([bookQuizAttempts.chapterId], {
      chapterId: bookQuizAttempts.chapterId,
      score: bookQuizAttempts.score,
      total: bookQuizAttempts.total,
    })
    .from(bookQuizAttempts)
    .where(and(eq(bookQuizAttempts.userId, userId), eq(bookQuizAttempts.bookId, bookId)))
    .orderBy(
      bookQuizAttempts.chapterId,
      desc(bookQuizAttempts.score),
      desc(bookQuizAttempts.completedAt),
      desc(bookQuizAttempts.id),
    );
  return new Map(attempts.map((a) => [a.chapterId, { score: a.score, total: a.total }]));
}

export async function getBookForUser(userId: string, bookId: string) {
  // One round-trip wave — the book lookup doesn't gate the other two, and
  // this page sits on the hottest e2e-observed navigation.
  // Chapter list columns only — the sections/quiz jsonb never rides list reads.
  const [book, chapters, bestByChapter] = await Promise.all([
    db.query.books.findFirst({
      where: and(eq(books.id, bookId), eq(books.origin, "seeded")),
    }),
    db
      .select({
        id: bookChapters.id,
        sortOrder: bookChapters.sortOrder,
        title: bookChapters.title,
        titleZh: bookChapters.titleZh,
        summaryZh: bookChapters.summaryZh,
        wordCount: bookChapters.wordCount,
        quizCount: bookChapters.quizCount,
      })
      .from(bookChapters)
      .where(eq(bookChapters.bookId, bookId))
      .orderBy(bookChapters.sortOrder),
    bestAttemptsByChapter(userId, bookId),
  ]);
  if (!book) return null;

  const states = deriveChapterStates(chapters, new Set(bestByChapter.keys()));
  const stateByChapter = new Map(states.map((s) => [s.chapterId, s]));

  return {
    book,
    chapters: chapters.map((chapter) => {
      const state = stateByChapter.get(chapter.id) as ChapterState;
      return {
        ...chapter,
        completed: state.completed,
        locked: state.locked,
        best: bestByChapter.get(chapter.id) ?? null,
        estMinutes: estimateChapterMinutes(chapter.wordCount, chapter.quizCount),
      };
    }),
  };
}

/** Has this chapter's gate been passed? Chapter 1 is always unlocked;
 * otherwise the previous chapter must have at least one quiz attempt. */
export async function isChapterUnlockedForUser(
  userId: string,
  chapter: { bookId: string; sortOrder: number },
): Promise<boolean> {
  if (chapter.sortOrder <= 1) return true;
  const previous = await db.query.bookChapters.findFirst({
    columns: { id: true },
    where: and(
      eq(bookChapters.bookId, chapter.bookId),
      eq(bookChapters.sortOrder, chapter.sortOrder - 1),
    ),
  });
  if (!previous) return true;
  const attempt = await db.query.bookQuizAttempts.findFirst({
    columns: { id: true },
    where: and(eq(bookQuizAttempts.userId, userId), eq(bookQuizAttempts.chapterId, previous.id)),
  });
  return attempt !== undefined;
}

export type BookChapterForReader =
  | {
      status: "ok";
      book: { id: string; title: string; titleZh: string };
      chapter: {
        id: string;
        sortOrder: number;
        chapterCount: number;
        title: string;
        titleZh: string;
        summaryZh: string | null;
        wordCount: number;
      } & ReturnType<typeof sanitizeChapter>;
      prevChapterId: string | null;
      nextChapterId: string | null;
    }
  | { status: "locked" };

/** The reader payload: sanitized sections + quiz, or the lock state. */
export async function getBookChapterForReader(
  userId: string,
  bookId: string,
  chapterId: string,
): Promise<BookChapterForReader | null> {
  // Two round-trip waves instead of five: chapter, book, and the neighbor
  // list are independent, and the lock check's previous-chapter lookup comes
  // free from the neighbors.
  const [chapter, book, neighbors] = await Promise.all([
    db.query.bookChapters.findFirst({
      where: and(eq(bookChapters.id, chapterId), eq(bookChapters.bookId, bookId)),
    }),
    db.query.books.findFirst({
      columns: { id: true, title: true, titleZh: true, chapterCount: true },
      where: and(eq(books.id, bookId), eq(books.origin, "seeded")),
    }),
    db
      .select({ id: bookChapters.id, sortOrder: bookChapters.sortOrder })
      .from(bookChapters)
      .where(eq(bookChapters.bookId, bookId))
      .orderBy(bookChapters.sortOrder),
  ]);
  if (!chapter || !book) return null;

  if (chapter.sortOrder > 1) {
    const previous = neighbors.find((n) => n.sortOrder === chapter.sortOrder - 1);
    if (previous) {
      const attempt = await db.query.bookQuizAttempts.findFirst({
        columns: { id: true },
        where: and(
          eq(bookQuizAttempts.userId, userId),
          eq(bookQuizAttempts.chapterId, previous.id),
        ),
      });
      if (!attempt) return { status: "locked" };
    }
  }

  const index = neighbors.findIndex((n) => n.id === chapter.id);

  return {
    status: "ok",
    book: { id: book.id, title: book.title, titleZh: book.titleZh },
    chapter: {
      id: chapter.id,
      sortOrder: chapter.sortOrder,
      chapterCount: book.chapterCount,
      title: chapter.title,
      titleZh: chapter.titleZh,
      summaryZh: chapter.summaryZh,
      wordCount: chapter.wordCount,
      // Sanitized: neither check-ins nor quiz ever carry answers here.
      ...sanitizeChapter(chapter),
    },
    prevChapterId: index > 0 ? neighbors[index - 1].id : null,
    nextChapterId: index < neighbors.length - 1 ? neighbors[index + 1].id : null,
  };
}

/**
 * The daily plan's book input: the current chapter of the most-recently-
 * active UNFINISHED book, or null. Started books are tried in recency order
 * — a finished recent book must not hide an older unfinished one. Null keeps
 * books out of the plan until the learner has started one — the plan
 * continues books, it never starts them (discovery stays on /books).
 */
export async function getContinueReading(
  userId: string,
): Promise<{ bookId: string; chapterId: string; estMinutes: number } | null> {
  // Bounded by the library size — a learner can only have started seeded books.
  const started = await db
    .select({ bookId: bookQuizAttempts.bookId, lastAt: max(bookQuizAttempts.completedAt) })
    .from(bookQuizAttempts)
    .where(eq(bookQuizAttempts.userId, userId))
    .groupBy(bookQuizAttempts.bookId)
    .orderBy(desc(max(bookQuizAttempts.completedAt)));

  for (const { bookId } of started) {
    const [chapters, bestByChapter] = await Promise.all([
      db
        .select({
          id: bookChapters.id,
          sortOrder: bookChapters.sortOrder,
          wordCount: bookChapters.wordCount,
          quizCount: bookChapters.quizCount,
        })
        .from(bookChapters)
        .where(eq(bookChapters.bookId, bookId))
        .orderBy(bookChapters.sortOrder),
      bestAttemptsByChapter(userId, bookId),
    ]);

    const states = deriveChapterStates(chapters, new Set(bestByChapter.keys()));
    const chapterId = currentChapterId(states);
    if (!chapterId) continue; // this book is finished — try the next one
    const current = chapters.find((c) => c.id === chapterId);
    if (!current) continue;
    return {
      bookId,
      chapterId,
      estMinutes: estimateChapterMinutes(current.wordCount, current.quizCount),
    };
  }
  return null;
}
