import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { memberships, user } from "../db/schema";
import { isValidCalendarDate } from "../membership-core";
import { NotFoundError } from "./errors";

/**
 * Admin mutations on memberships (ADR 0025). Unlike userId-scoped services,
 * grant takes the acting admin first (actor ≠ target; grantedBy records the
 * actor) — the requireAdmin() gate lives in the calling action, per the
 * "layouts don't protect actions" rule.
 */

export const GrantPremiumSchema = z.object({
  userId: z.string().min(1),
  /** Date-only string from the admin form; null = no expiry. Must be a real calendar date. */
  expiresAt: z.union([z.string().refine(isValidCalendarDate, "not a calendar date"), z.null()]),
});

export const RevokePremiumSchema = z.object({
  userId: z.string().min(1),
});

/** Premium runs through the end of the chosen date (UTC) — a grant "until 9/30" includes 9/30. */
function endOfDateUtc(day: string): Date {
  return new Date(`${day}T23:59:59.999Z`);
}

/** Returns the persisted expiry so callers can surface canonical state, not echoed input. */
export async function grantPremiumForUser(
  actorId: string,
  input: unknown,
): Promise<{ expiresAt: Date | null }> {
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
  return { expiresAt: expiry };
}

/** Idempotent: revoking an already-free user is a no-op (no row = free). */
export async function revokePremiumForUser(input: unknown): Promise<void> {
  const { userId } = RevokePremiumSchema.parse(input);
  await db.delete(memberships).where(eq(memberships.userId, userId));
}
