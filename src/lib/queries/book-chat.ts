import { and, asc, desc, eq, lt, max, or } from "drizzle-orm";
import { db } from "../db";
import {
  bookChatMessages,
  bookChatStates,
  bookChapters,
  bookQuizAttempts,
  books,
} from "../db/schema";
import { getCalendarDayForUser } from "../streak";
import { getEntitlementsForUser } from "./membership";

const HISTORY_LIMIT = 50;

/**
 * The chattable set: seeded books plus (future BYOB) the user's own. A book
 * outside it does not exist for this user — enforced on both the GET shape
 * and, via getBookAndPriorChapters, before the send path's quota claim, so a
 * foreign user-owned book can never reach the AI provider.
 */
function chattableBook(userId: string, bookId: string) {
  return and(eq(books.id, bookId), or(eq(books.origin, "seeded"), eq(books.ownerUserId, userId)));
}

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
      where: chattableBook(userId, bookId),
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
 * The spoiler-safe context rows, gated by the chattable-set rule (null =
 * not chattable for this user → 404). The summary boundary is the reader's
 * COMPLETED FRONTIER, not the visited chapter: revisiting an earlier chapter
 * keeps every completed chapter's summary in context, so the per-book
 * thread's history stays coherent. Prose beyond the visited chapter is never
 * fetched here — summaries only (buildBookChatContext re-filters as defense
 * in depth).
 */
export async function getBookAndPriorChapters(
  userId: string,
  bookId: string,
  visitedSortOrder: number,
) {
  const [book, completedRows] = await Promise.all([
    db.query.books.findFirst({
      columns: {
        id: true,
        title: true,
        titleZh: true,
        author: true,
        cefrLevel: true,
        chapterCount: true,
      },
      where: chattableBook(userId, bookId),
    }),
    db
      .select({ completedThrough: max(bookChapters.sortOrder) })
      .from(bookQuizAttempts)
      .innerJoin(
        bookChapters,
        and(
          eq(bookQuizAttempts.bookId, bookChapters.bookId),
          eq(bookQuizAttempts.chapterId, bookChapters.id),
        ),
      )
      .where(and(eq(bookQuizAttempts.userId, userId), eq(bookQuizAttempts.bookId, bookId))),
  ]);
  if (!book) return null;

  const completedThrough = completedRows[0]?.completedThrough ?? 0;
  const boundary = Math.max(visitedSortOrder, completedThrough + 1);
  const priorChapters = await db
    .select({
      sortOrder: bookChapters.sortOrder,
      title: bookChapters.title,
      summaryZh: bookChapters.summaryZh,
    })
    .from(bookChapters)
    .where(and(eq(bookChapters.bookId, bookId), lt(bookChapters.sortOrder, boundary)))
    .orderBy(asc(bookChapters.sortOrder));
  return { book, priorChapters, completedThrough };
}
