import { and, asc, desc, eq, lt } from "drizzle-orm";
import { db } from "../db";
import { bookChatMessages, bookChatStates, bookChapters, books } from "../db/schema";
import { getCalendarDayForUser } from "../streak";
import { getEntitlementsForUser } from "./membership";

const HISTORY_LIMIT = 50;

/**
 * Reads for the premium book tutor chat (ADR 0030): one thread per
 * (user, book). The GET/page payload carries the gate as data
 * (`entitled: false`) rather than a 403 — a downgraded user's history is
 * still theirs to read; only sending is premium-gated.
 */
export async function getBookChatPageData(userId: string, bookId: string) {
  const [book, today, entitlements, rows, state] = await Promise.all([
    db.query.books.findFirst({
      columns: { id: true },
      where: and(eq(books.id, bookId), eq(books.origin, "seeded")),
    }),
    getCalendarDayForUser(userId),
    getEntitlementsForUser(userId),
    db.query.bookChatMessages.findMany({
      where: and(eq(bookChatMessages.userId, userId), eq(bookChatMessages.bookId, bookId)),
      orderBy: desc(bookChatMessages.sequence),
      limit: HISTORY_LIMIT,
      columns: { id: true, role: true, content: true, chapterId: true, createdAt: true },
    }),
    db.query.bookChatStates.findFirst({
      where: and(eq(bookChatStates.userId, userId), eq(bookChatStates.bookId, bookId)),
    }),
  ]);
  if (!book) return null;

  const dailyLimit = entitlements.bookChatDailyLimit;
  const usedToday = state?.day === today ? state.usedCount : 0;
  return {
    entitled: entitlements.bookChatEnabled,
    dailyLimit,
    remainingToday: Math.max(0, dailyLimit - usedToday),
    messages: rows.reverse(),
  };
}

/**
 * The spoiler-safe context rows: the book plus ONLY chapters before the
 * reader's position, as title + summary — never their prose, never anything
 * at or beyond `beforeSortOrder` (buildBookChatContext re-filters as defense
 * in depth).
 */
export async function getBookAndPriorChapters(bookId: string, beforeSortOrder: number) {
  const [book, priorChapters] = await Promise.all([
    db.query.books.findFirst({
      columns: {
        id: true,
        title: true,
        titleZh: true,
        author: true,
        cefrLevel: true,
        chapterCount: true,
      },
      where: and(eq(books.id, bookId), eq(books.origin, "seeded")),
    }),
    db
      .select({
        sortOrder: bookChapters.sortOrder,
        title: bookChapters.title,
        summaryZh: bookChapters.summaryZh,
      })
      .from(bookChapters)
      .where(and(eq(bookChapters.bookId, bookId), lt(bookChapters.sortOrder, beforeSortOrder)))
      .orderBy(asc(bookChapters.sortOrder)),
  ]);
  if (!book) return null;
  return { book, priorChapters };
}
