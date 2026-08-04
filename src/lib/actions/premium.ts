"use server";

import { requireUser } from "../auth/session";
import { registerPremiumInterestForUser } from "../services/premium-interest";

export async function registerPremiumInterest(): Promise<{ ok: true }> {
  const user = await requireUser();
  await registerPremiumInterestForUser(user.id);
  return { ok: true };
}
