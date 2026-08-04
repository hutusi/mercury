import { db } from "../db";
import { premiumInterest } from "../db/schema";

/** Idempotent: clicking 预约开通 twice is one row — the signal is binary. */
export async function registerPremiumInterestForUser(userId: string): Promise<void> {
  await db.insert(premiumInterest).values({ userId }).onConflictDoNothing();
}
