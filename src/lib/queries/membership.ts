import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "../db";
import { memberships, premiumInterest } from "../db/schema";
import {
  entitlementsForTier,
  resolveTier,
  type Entitlements,
  type ResolvedTier,
} from "../membership-core";

/**
 * The raw membership row (null = free). Deduped per request like getSettings;
 * in server actions and route handlers cache() is a harmless passthrough.
 */
export const getMembershipForUser = cache(async (userId: string) => {
  return db.query.memberships.findFirst({ where: eq(memberships.userId, userId) });
});

export async function getTierForUser(userId: string, now = new Date()): Promise<ResolvedTier> {
  return resolveTier((await getMembershipForUser(userId)) ?? null, now);
}

/**
 * One extra indexed read per gated mutation — call before claim transactions,
 * never inside. Callers with their own clock pass it so membership expiry is
 * evaluated at the same instant as the quota day and claim checks.
 */
export async function getEntitlementsForUser(
  userId: string,
  now = new Date(),
): Promise<Entitlements> {
  return entitlementsForTier(await getTierForUser(userId, now));
}

/** Has this user clicked 预约开通 on /premium? Drives the button's state. */
export async function hasPremiumInterest(userId: string): Promise<boolean> {
  const row = await db.query.premiumInterest.findFirst({
    columns: { userId: true },
    where: eq(premiumInterest.userId, userId),
  });
  return row !== undefined;
}
