/**
 * Pure membership logic (DB-free): tier resolution and the entitlements each
 * tier grants (ADR 0025). Persistence lives in src/lib/queries/membership.ts
 * and src/lib/services/memberships.ts.
 */

import { aiGradingDailyLimit } from "./ai-grading-core";
import { chatDailyLimit } from "./chat-core";

export type ResolvedTier = "free" | "premium";

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
 * What a tier is entitled to. Quotas only for now; future premium features
 * (BYOB upload, …) land here as booleans so gating stays one lookup.
 */
export interface Entitlements {
  chatDailyLimit: number;
  aiGradingDailyLimit: number;
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
  };
}
