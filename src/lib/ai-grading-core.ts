import { createHash } from "node:crypto";

export const DEFAULT_AI_GRADING_DAILY_LIMIT = 10;
export const GRADING_CLAIM_STALE_MS = 2 * 60 * 1000;

export function aiGradingDailyLimit(env: Record<string, string | undefined> = process.env): number {
  const parsed = Number.parseInt(env.MERCURY_AI_GRADING_DAILY_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_AI_GRADING_DAILY_LIMIT;
}

export function gradingInputHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
