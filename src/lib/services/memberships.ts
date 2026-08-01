import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { memberships, user } from "../db/schema";
import {
  endOfDateUtc,
  isGrantableExpiryDate,
  resolveTier,
  type ResolvedTier,
} from "../membership-core";
import { NotFoundError } from "./errors";

/**
 * Admin mutations on memberships (ADR 0025). Unlike userId-scoped services,
 * grant takes the acting admin first (actor ≠ target; grantedBy records the
 * actor) — the requireAdmin() gate lives in the calling action, per the
 * "layouts don't protect actions" rule.
 */

export const GrantPremiumSchema = z.object({
  userId: z.string().min(1),
  /** Date-only string from the admin form; null = no expiry. Must be a real FUTURE calendar date. */
  expiresAt: z.union([
    // Closure, not a reference: `now` must be evaluated per parse.
    z.string().refine((day) => isGrantableExpiryDate(day), "expiry must be a future calendar date"),
    z.null(),
  ]),
});

export const RevokePremiumSchema = z.object({
  userId: z.string().min(1),
});

/**
 * Returns the persisted state so callers surface canonical values, not echoed
 * input — the tier is re-derived from the stored row rather than assumed.
 */
export async function grantPremiumForUser(
  actorId: string,
  input: unknown,
): Promise<{ tier: ResolvedTier; expiresAt: Date | null }> {
  const { userId, expiresAt } = GrantPremiumSchema.parse(input);
  const expiry = expiresAt === null ? null : endOfDateUtc(expiresAt);

  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new NotFoundError("User not found");

  // Upsert: re-granting (e.g. over an expired row) refreshes expiry and audit fields.
  await db
    .insert(memberships)
    .values({ userId, tier: "premium", expiresAt: expiry, grantedBy: actorId, source: "manual" })
    .onConflictDoUpdate({
      target: memberships.userId,
      set: {
        tier: "premium",
        expiresAt: expiry,
        grantedBy: actorId,
        source: "manual",
        updatedAt: new Date(),
      },
    });
  return { tier: resolveTier({ tier: "premium", expiresAt: expiry }), expiresAt: expiry };
}

/** Idempotent: revoking an already-free user is a no-op (no row = free). */
export async function revokePremiumForUser(input: unknown): Promise<void> {
  const { userId } = RevokePremiumSchema.parse(input);
  await db.delete(memberships).where(eq(memberships.userId, userId));
}
