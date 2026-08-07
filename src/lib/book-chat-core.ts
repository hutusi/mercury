/**
 * Pure book-tutor-chat logic (DB-free): the premium-only reading-coach chat on
 * the book reader (ADR 0030). Persistence and the AI call live in
 * src/lib/services/book-chat.ts.
 */

const DEFAULT_DAILY_LIMIT = 50;

/**
 * Per-(user, book) user-messages-per-day cap. The cap is scoped to one book —
 * the worst case per user is limit × library size, accepted for the curated
 * seven-book library (ADR 0030).
 */
export function bookChatDailyLimit(env: Record<string, string | undefined> = process.env): number {
  const parsed = Number.parseInt(env.MERCURY_BOOK_CHAT_DAILY_LIMIT ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DAILY_LIMIT;
  return parsed;
}
