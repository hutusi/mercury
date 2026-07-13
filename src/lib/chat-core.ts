/**
 * Pure tutor-chat logic (DB-free): the daily message cap and the context
 * window sent to the model. Persistence and the AI call live in
 * src/lib/services/chat.ts.
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** History turns (plus the new user message) sent to the model per reply. */
export const CHAT_CONTEXT_TURNS = 20;

const DEFAULT_DAILY_LIMIT = 30;

/** Per-user user-messages-per-day cap — the app's first AI cost control. */
export function chatDailyLimit(env: Record<string, string | undefined> = process.env): number {
  const parsed = Number.parseInt(env.MERCURY_CHAT_DAILY_LIMIT ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DAILY_LIMIT;
  return parsed;
}

/**
 * Chronological tail of the thread plus the new user message. Anthropic
 * requires the first message to be user-role, so a leading assistant turn
 * left by the slice is dropped.
 */
export function buildChatWindow(
  history: ChatTurn[],
  nextUserContent: string,
  max = CHAT_CONTEXT_TURNS,
): ChatTurn[] {
  const window = [...history, { role: "user" as const, content: nextUserContent }].slice(-max);
  while (window[0]?.role === "assistant") window.shift();
  return window;
}
