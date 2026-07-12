import type { learnerProfiles } from "../../db/schema";
import { defaultSkillEstimates, emptyCoachMemo } from "../../learner-model-core";

/**
 * The one profile payload shape for /api/v1/me/profile (GET and PATCH).
 * A user without a row gets the same shape with defaults so clients never
 * branch on null. targetScore is IELTS band×10 when goalTrack is "ielts".
 */
export function serializeProfile(profile: typeof learnerProfiles.$inferSelect | null) {
  if (!profile) {
    return {
      goalTrack: null,
      targetScore: null,
      examDate: null,
      dailyMinutes: 20,
      selfRatedLevel: null,
      skillEstimates: defaultSkillEstimates(null, new Date()),
      coachMemo: emptyCoachMemo(),
    };
  }
  return {
    goalTrack: profile.goalTrack,
    targetScore: profile.targetScore,
    examDate: profile.examDate,
    dailyMinutes: profile.dailyMinutes,
    selfRatedLevel: profile.selfRatedLevel,
    skillEstimates: profile.skillEstimates,
    coachMemo: profile.coachMemo,
  };
}
