import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { activeAiModel, AiUnavailableError, getBookTutorReply, isAiEnabled } from "../ai/client";
import { bookChatGate, buildBookChatContext } from "../book-chat-core";
import { buildChatWindow, chatClaimIsFresh } from "../chat-core";
import { db } from "../db";
import { bookChatMessages, bookChatStates } from "../db/schema";
import { getBookAndPriorChapters } from "../queries/book-chat";
import { isChapterUnlockedForUser } from "../queries/books";
import { getEntitlementsForUser } from "../queries/membership";
import { getCalendarDayForUser, recordActivityWith } from "../streak";
import { findChapterInBook } from "./books";
import { tutorLearnerContext } from "./chat";
import { ConflictError, LimitExceededError, NotFoundError, PremiumRequiredError } from "./errors";

/**
 * The premium book tutor chat (ADR 0030): one rolling thread per
 * (user, book), riding the ADR 0013 claim/sequence machinery on its own
 * tables. Guard order is load-bearing — enabled before entitled, so keyless
 * environments report the feature absent instead of advertising a premium
 * gate they cannot serve (see bookChatGate in book-chat-core).
 */

export const SendBookChatMessageSchema = z.object({
  bookId: z.string().min(1),
  chapterId: z.string().min(1),
  content: z.string().trim().min(1).max(4000),
});

export interface BookChatReply {
  message: {
    id: string;
    role: "assistant";
    content: string;
    chapterId: string;
    createdAt: Date;
  };
  remainingToday: number;
}

interface BookChatTurnClaim {
  claimId: string;
  day: string;
  limit: number;
}

/**
 * Lock this (user, book) thread's quota state and grant exactly one provider
 * call at a time. The caller passes the entitlement-derived limit — read
 * before the transaction, never under the lock (ADR 0025).
 */
export async function claimBookChatTurnForUser(
  userId: string,
  bookId: string,
  day: string,
  limit: number,
  now = new Date(),
): Promise<BookChatTurnClaim> {
  return db.transaction(async (tx) => {
    await tx
      .insert(bookChatStates)
      .values({ userId, bookId, day, usedCount: 0, nextSequence: 1 })
      .onConflictDoNothing();
    const [state] = await tx
      .select()
      .from(bookChatStates)
      .where(and(eq(bookChatStates.userId, userId), eq(bookChatStates.bookId, bookId)))
      .for("update")
      .limit(1);
    if (!state) throw new Error("Book chat state missing after upsert");

    const usedCount = state.day === day ? state.usedCount : 0;
    const claimIsFresh = state.claimId !== null && chatClaimIsFresh(state.claimStartedAt, now);
    if (claimIsFresh) {
      throw new ConflictError("A book tutor reply is already in progress", "book_chat_in_progress");
    }
    if (usedCount >= limit) {
      throw new LimitExceededError("Daily book chat limit reached", "book_chat_limit_reached");
    }

    const claimId = crypto.randomUUID();
    await tx
      .update(bookChatStates)
      .set({ day, usedCount, claimId, claimStartedAt: now })
      .where(and(eq(bookChatStates.userId, userId), eq(bookChatStates.bookId, bookId)));
    return { claimId, day, limit };
  });
}

async function clearBookChatClaim(userId: string, bookId: string, claimId: string): Promise<void> {
  await db
    .update(bookChatStates)
    .set({ claimId: null, claimStartedAt: null })
    .where(
      and(
        eq(bookChatStates.userId, userId),
        eq(bookChatStates.bookId, bookId),
        eq(bookChatStates.claimId, claimId),
      ),
    );
}

/**
 * One book tutor turn: gates → single-flight/quota claim → spoiler-safe
 * context → AI reply → persist BOTH messages and consume quota atomically.
 * Failed replies clear the claim, store nothing, and consume no quota.
 */
export async function sendBookChatMessageForUser(
  userId: string,
  input: unknown,
): Promise<BookChatReply> {
  const requestedAt = new Date();
  // Entitlements resolve before any quota transaction (ADR 0025), at the same
  // instant the claim will evaluate freshness. bookChatGate owns the
  // load-bearing enabled-before-entitled ordering — using it here keeps the
  // tested function and the running gate the same code.
  const entitlements = await getEntitlementsForUser(userId, requestedAt);
  const gate = bookChatGate({ enabled: isAiEnabled(), entitled: entitlements.bookChatEnabled });
  if (gate === "ai_unavailable") {
    throw new AiUnavailableError("No AI provider is configured");
  }
  if (gate === "premium_required") {
    // The first hard premium gate (ADR 0025's reserved recipe).
    throw new PremiumRequiredError("The book tutor chat requires a premium membership");
  }
  const { bookId, chapterId, content } = SendBookChatMessageSchema.parse(input);

  const chapter = await findChapterInBook(bookId, chapterId);
  // A locked chapter's content is never readable, so it is not chattable either.
  if (!(await isChapterUnlockedForUser(userId, chapter))) {
    throw new ConflictError("Previous chapter quiz not submitted", "chapter_locked");
  }

  const day = await getCalendarDayForUser(userId);
  const claim = await claimBookChatTurnForUser(
    userId,
    bookId,
    day,
    entitlements.bookChatDailyLimit,
    requestedAt,
  );
  try {
    // Recent turns, chronological (query newest-first, then reverse).
    const recent = await db.query.bookChatMessages.findMany({
      where: and(eq(bookChatMessages.userId, userId), eq(bookChatMessages.bookId, bookId)),
      orderBy: desc(bookChatMessages.sequence),
      limit: 20,
      columns: { role: true, content: true },
    });
    const window = buildChatWindow(recent.reverse(), content);

    const context = await getBookAndPriorChapters(bookId, chapter.sortOrder);
    if (!context) throw new NotFoundError(`Unknown book: ${bookId}`);
    // The whitelist boundary: sections enter as bare text; check-ins, quiz
    // items, and their answers have no path into the prompt.
    const bookContext = buildBookChatContext({
      book: context.book,
      currentChapter: {
        sortOrder: chapter.sortOrder,
        title: chapter.title,
        titleZh: chapter.titleZh,
        sectionTexts: chapter.sections.map((section) => section.text),
      },
      priorChapters: context.priorChapters,
    });
    const learnerContext = await tutorLearnerContext(userId);
    const reply = await getBookTutorReply({ bookContext, learnerContext, messages: window });

    const now = new Date();
    const persisted = await db.transaction(async (tx) => {
      const [state] = await tx
        .select()
        .from(bookChatStates)
        .where(and(eq(bookChatStates.userId, userId), eq(bookChatStates.bookId, bookId)))
        .for("update")
        .limit(1);
      if (!state || state.claimId !== claim.claimId) {
        throw new ConflictError(
          "The book tutor request was superseded",
          "book_chat_claim_superseded",
        );
      }

      await tx.insert(bookChatMessages).values({
        userId,
        bookId,
        chapterId,
        role: "user",
        content,
        day: claim.day,
        sequence: state.nextSequence,
        createdAt: now,
      });
      const [row] = await tx
        .insert(bookChatMessages)
        .values({
          userId,
          bookId,
          chapterId,
          role: "assistant",
          content: reply,
          model: activeAiModel(),
          day: claim.day,
          sequence: state.nextSequence + 1,
          createdAt: new Date(now.getTime() + 1),
        })
        .returning();
      const usedCount = state.usedCount + 1;
      await tx
        .update(bookChatStates)
        .set({
          usedCount,
          nextSequence: state.nextSequence + 2,
          claimId: null,
          claimStartedAt: null,
        })
        .where(and(eq(bookChatStates.userId, userId), eq(bookChatStates.bookId, bookId)));
      await recordActivityWith(tx, userId, now);
      return { assistant: row, usedCount };
    });

    return {
      message: {
        id: persisted.assistant.id,
        role: "assistant",
        content: persisted.assistant.content,
        chapterId: persisted.assistant.chapterId,
        createdAt: persisted.assistant.createdAt,
      },
      remainingToday: Math.max(0, claim.limit - persisted.usedCount),
    };
  } catch (error) {
    // Matching by claim id makes this safe even after a stale takeover.
    await clearBookChatClaim(userId, bookId, claim.claimId);
    throw error;
  }
}
