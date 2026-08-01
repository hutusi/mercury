"use server";

import { ZodError } from "zod";
import { requireAdmin } from "../auth/session";
import { NotFoundError } from "../services/errors";
import { grantPremiumForUser, revokePremiumForUser } from "../services/memberships";

/**
 * Discriminated unions, not throws: production Next masks server-action error
 * messages, so the client couldn't tell "user gone" from "bad input" otherwise
 * (same convention as sendTutorMessage).
 */
export type AdminMembershipResult =
  { ok: true } | { ok: false; error: "not_found" | "invalid_input" };

export async function grantPremium(input: unknown): Promise<AdminMembershipResult> {
  const actor = await requireAdmin();
  try {
    await grantPremiumForUser(actor.id, input);
    return { ok: true };
  } catch (error) {
    if (error instanceof NotFoundError) return { ok: false, error: "not_found" };
    if (error instanceof ZodError) return { ok: false, error: "invalid_input" };
    throw error;
  }
}

export async function revokePremium(input: unknown): Promise<AdminMembershipResult> {
  await requireAdmin();
  try {
    await revokePremiumForUser(input);
    return { ok: true };
  } catch (error) {
    if (error instanceof ZodError) return { ok: false, error: "invalid_input" };
    throw error;
  }
}
