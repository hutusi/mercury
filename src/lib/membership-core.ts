/**
 * Pure membership logic (DB-free): tier resolution and the entitlements each
 * tier grants (ADR 0025). Persistence lives in src/lib/queries/membership.ts
 * and src/lib/services/memberships.ts.
 */

import { aiGradingDailyLimit } from "./ai-grading-core";
import { bookChatDailyLimit } from "./book-chat-core";
import { chatDailyLimit } from "./chat-core";

export type ResolvedTier = "free" | "premium";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True only for real calendar dates. JS Date silently rolls 2026-02-31 into
 * March and parses 9999-99-99 as Invalid Date, so shape-checking alone is not
 * enough — require the parse to round-trip to the supplied string. Year 0000
 * is rejected too: valid in ISO/JS, but Postgres has no year zero.
 */
export function isValidCalendarDate(day: string): boolean {
  if (!DATE_ONLY.test(day) || day.startsWith("0000")) return false;
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

/** Premium runs through the end of the chosen date (UTC) — a grant "until 9/30" includes 9/30. */
export function endOfDateUtc(day: string): Date {
  return new Date(`${day}T23:59:59.999Z`);
}

/**
 * A grantable expiry must still be premium the moment it is granted — today is
 * fine (expires tonight UTC), yesterday is not. A past expiry would make
 * "grant succeeded" and "user is premium" contradict each other.
 */
export function isGrantableExpiryDate(day: string, now: Date = new Date()): boolean {
  return isValidCalendarDate(day) && endOfDateUtc(day).getTime() > now.getTime();
}

/** The membership row fields tier resolution needs (queries pass the row). */
export interface MembershipLike {
  tier: "premium";
  expiresAt: Date | null;
}

/** No row = free; an expired row also resolves to free (re-grants upsert over it). */
export function resolveTier(
  membership: MembershipLike | null | undefined,
  now: Date = new Date(),
): ResolvedTier {
  if (!membership) return "free";
  if (membership.expiresAt !== null && membership.expiresAt.getTime() <= now.getTime()) {
    return "free";
  }
  return membership.tier;
}

/**
 * What a tier is entitled to. Quotas plus hard gates as booleans (ADR 0025's
 * recipe) so gating stays one lookup. `bookChatEnabled` is the first hard
 * gate: the book tutor chat (ADR 0030) is premium-only, and its daily cap is
 * a single env value — the boolean is the gate, so there is no free/premium
 * limit pair to clamp.
 */
export interface Entitlements {
  chatDailyLimit: number;
  aiGradingDailyLimit: number;
  bookChatEnabled: boolean;
  bookChatDailyLimit: number;
}

const DEFAULT_PREMIUM_CHAT_DAILY_LIMIT = 100;
const DEFAULT_PREMIUM_AI_GRADING_DAILY_LIMIT = 30;

function premiumLimit(raw: string | undefined, fallback: number, floor: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  const limit = Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
  // An operator who raises a free cap above the premium value must never make
  // premium worse than free.
  return Math.max(limit, floor);
}

export function entitlementsForTier(
  tier: ResolvedTier,
  env: Record<string, string | undefined> = process.env,
): Entitlements {
  const free: Entitlements = {
    chatDailyLimit: chatDailyLimit(env),
    aiGradingDailyLimit: aiGradingDailyLimit(env),
    bookChatEnabled: false,
    bookChatDailyLimit: bookChatDailyLimit(env),
  };
  if (tier === "free") return free;
  return {
    chatDailyLimit: premiumLimit(
      env.MERCURY_CHAT_DAILY_LIMIT_PREMIUM,
      DEFAULT_PREMIUM_CHAT_DAILY_LIMIT,
      free.chatDailyLimit,
    ),
    aiGradingDailyLimit: premiumLimit(
      env.MERCURY_AI_GRADING_DAILY_LIMIT_PREMIUM,
      DEFAULT_PREMIUM_AI_GRADING_DAILY_LIMIT,
      free.aiGradingDailyLimit,
    ),
    bookChatEnabled: true,
    bookChatDailyLimit: free.bookChatDailyLimit,
  };
}
