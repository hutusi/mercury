import type { Track } from "../../content/types";
import type { SkillKey } from "../learner-model-core";
import { countActiveMistakes } from "../mistakes";
import { practiceOrder } from "../plan-core";
import { getLearnerProfile } from "./profile";
import { getVocabCounts } from "./vocab";

export interface ShellMetas {
  /** Vocabulary cards due now (sidebar meta on Vocabulary). */
  dueCount: number;
  /** Active mistakes (the coral badge on Mistakes). */
  activeMistakes: number;
  /** The weakest measured skill, or null while the model is unrated. */
  weakestSkill: SkillKey | null;
  goalTrack: Track | null;
  /** TOEIC score, or IELTS band × 10 (as stored). */
  targetScore: number | null;
  dailyMinutes: number;
}

/**
 * The navigation shell's live numbers. The shell layout starts this without
 * awaiting it and hands the promise to client components, which read it
 * under Suspense — so a page never waits on its badges. Every input is
 * cache()-deduped with the pages that read the same data.
 */
export async function getShellMetas(userId: string): Promise<ShellMetas> {
  const [vocab, activeMistakes, profile] = await Promise.all([
    getVocabCounts(userId),
    countActiveMistakes(userId, null),
    getLearnerProfile(userId),
  ]);
  const estimates = profile?.skillEstimates ?? null;
  // Only a measured skill earns the "weak" flag: unrated seeds all tie.
  const measured = estimates && Object.values(estimates).some((e) => e.confidence !== "low");
  return {
    dueCount: vocab.dueCount,
    activeMistakes,
    weakestSkill: measured ? practiceOrder(estimates)[0] : null,
    goalTrack: profile?.goalTrack ?? null,
    targetScore: profile?.targetScore ?? null,
    dailyMinutes: profile?.dailyMinutes ?? 20,
  };
}
