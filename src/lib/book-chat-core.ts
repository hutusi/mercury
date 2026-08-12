/**
 * Pure book-tutor-chat logic (DB-free): the premium-only reading-coach chat on
 * the book reader (ADR 0030) — daily cap, gate ordering, prompt-context
 * assembly, and the client-side quote/error helpers. Persistence and the AI
 * call live in src/lib/services/book-chat.ts.
 */

import { sanitizeUntrusted } from "./ai/sanitize";

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

/**
 * Gate order is load-bearing: keyless environments report the feature as
 * absent (ai_unavailable) even to free users — a 403 premium_required from a
 * keyless server would advertise a feature that cannot run there.
 */
export function bookChatGate(input: {
  enabled: boolean;
  entitled: boolean;
}): "ai_unavailable" | "premium_required" | null {
  if (!input.enabled) return "ai_unavailable";
  if (!input.entitled) return "premium_required";
  return null;
}

/**
 * The input type IS the spoiler/answer whitelist: sections enter as bare
 * text, prior chapters as title + summary — there is no slot for check-ins,
 * quiz items, correctIndex, or explanationZh (same philosophy as
 * sanitizeChapter, which keeps them off the client).
 */
export interface BookChatContextInput {
  book: {
    title: string;
    titleZh: string;
    author: string;
    cefrLevel: string;
    chapterCount: number;
  };
  currentChapter: {
    sortOrder: number;
    title: string;
    titleZh: string;
    sectionTexts: string[];
  };
  /**
   * Highest chapter sortOrder the reader has provably seen (completed its
   * quiz, chatted from it, or is visiting it; 0 = none). The spoiler
   * boundary is this exposure frontier, not the visited chapter — revisiting
   * an earlier chapter must not pretend already-seen chapters are unread, or
   * the thread's own history turns incoherent.
   */
  readThroughSortOrder: number;
  priorChapters: {
    sortOrder: number;
    title: string;
    summaryZh: string | null;
  }[];
}

export const MAX_SUMMARY_CHARS = 400;
export const MAX_PRIOR_BLOCK_CHARS = 6_000;
/**
 * Safety valve only — the largest seeded chapter (gg-ch-07) is ≈49k chars of
 * prose, and a content guard test asserts every chapter fits, so this never
 * truncates shipped content.
 */
export const MAX_CHAPTER_CHARS = 60_000;

/** Keeps any single prior-chapter line far below MAX_PRIOR_BLOCK_CHARS. */
const MAX_TITLE_CHARS = 120;

const PRIOR_ELISION_MARKER = "（更早章节梗概略）";
const CHAPTER_TRUNCATION_MARKER = "……（本章后续内容因长度截断）";

function truncateChars(text: string, max: number, marker: string): string {
  // Length and slice must use the same unit (code points): astral characters
  // are 2 UTF-16 units, and mixing the two returns untruncated text with a
  // marker falsely appended.
  const codePoints = [...text];
  if (codePoints.length <= max) return text;
  return `${codePoints.slice(0, max).join("").trimEnd()}${marker}`;
}

/**
 * The `<book_context>` block for the system prompt. The reader page renders
 * the whole current chapter at once, so its full prose is fair context; the
 * spoiler boundary is everything after it — chapters with sortOrder >= the
 * current one are hard-filtered here even if a caller passes them, and later
 * chapters are never part of the input shape to begin with.
 */
export function buildBookChatContext(input: BookChatContextInput): string {
  const { book, currentChapter } = input;

  // Everything up to the exposure frontier is read; the visited chapter's
  // own summary is dropped — its full prose is already below.
  const readThrough = Math.max(currentChapter.sortOrder, input.readThroughSortOrder);
  const priors = input.priorChapters
    .filter(
      (chapter) =>
        chapter.sortOrder <= readThrough && chapter.sortOrder !== currentChapter.sortOrder,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const priorLines = priors.map((chapter) => {
    const summary = chapter.summaryZh
      ? truncateChars(sanitizeUntrusted(chapter.summaryZh), MAX_SUMMARY_CHARS, "……")
      : "";
    const title = truncateChars(sanitizeUntrusted(chapter.title), MAX_TITLE_CHARS, "…");
    return summary
      ? `Chapter ${chapter.sortOrder} — ${title}: ${summary}`
      : `Chapter ${chapter.sortOrder} — ${title}`;
  });

  // Keep the most recent chapters (closest to the reader's position), drop the
  // oldest first when over budget, and say so instead of silently omitting.
  // Title + summary caps bound every line well under the block budget, so the
  // break below can never fire on the first (most recent) line.
  const kept: string[] = [];
  let used = 0;
  for (const line of [...priorLines].reverse()) {
    if (used + line.length > MAX_PRIOR_BLOCK_CHARS) break;
    kept.unshift(line);
    used += line.length;
  }
  if (kept.length < priorLines.length) kept.unshift(PRIOR_ELISION_MARKER);

  const prose = truncateChars(
    sanitizeUntrusted(currentChapter.sectionTexts.join("\n\n")),
    MAX_CHAPTER_CHARS,
    `\n${CHAPTER_TRUNCATION_MARKER}`,
  );

  const chapterName = `"${sanitizeUntrusted(currentChapter.title)}"（${sanitizeUntrusted(currentChapter.titleZh)}）`;
  const position =
    readThrough > currentChapter.sortOrder
      ? `The reader has read up to chapter ${readThrough} of ${book.chapterCount} and is currently revisiting chapter ${currentChapter.sortOrder}: ${chapterName}.`
      : `The reader is on chapter ${currentChapter.sortOrder} of ${book.chapterCount}: ${chapterName}.`;
  const header =
    `"${sanitizeUntrusted(book.title)}"（${sanitizeUntrusted(book.titleZh)}）` +
    `by ${sanitizeUntrusted(book.author)}, CEFR ${book.cefrLevel}. ${position}`;

  const blocks = [`<book>${header}</book>`];
  if (kept.length > 0) blocks.push(`<previous_chapters>\n${kept.join("\n")}\n</previous_chapters>`);
  blocks.push(`<current_chapter>\n${prose}\n</current_chapter>`);
  return `<book_context>\n${blocks.join("\n")}\n</book_context>`;
}

export const MAX_QUOTE_CHARS = 300;

/**
 * Normalize a reader text selection into a quotable snippet. Selections come
 * from a single whitespace-pre-line text node, so they carry literal
 * paragraph breaks — collapse all whitespace runs to single spaces.
 */
export function clampQuote(raw: string, max = MAX_QUOTE_CHARS): string | null {
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return null;
  return truncateChars(normalized, max, "…");
}

/**
 * Map the send action's error union onto the panel's state machine. Unknown
 * arms (including premium_required, unreachable while the entry points are
 * tier-gated server-side) degrade to the generic failed state.
 */
export function mapSendErrorToPanelState(
  error: string,
): "unavailable" | "limit" | "in_progress" | "failed" {
  switch (error) {
    case "ai_unavailable":
      return "unavailable";
    case "limit_reached":
      return "limit";
    case "in_progress":
      return "in_progress";
    default:
      return "failed";
  }
}
