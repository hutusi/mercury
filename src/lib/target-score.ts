import type { Track } from "../content/types";

/**
 * A stored target score as learners read it: TOEIC as-is ("785"), IELTS
 * stored as band × 10 shown as a band ("6.5"). Business English has no
 * scored exam, and an unset target renders as null. Pure and client-safe.
 */
export function formatTargetScore(track: Track, targetScore: number | null): string | null {
  if (targetScore === null) return null;
  if (track === "toeic") return String(targetScore);
  if (track === "ielts") return (targetScore / 10).toFixed(1);
  return null;
}
