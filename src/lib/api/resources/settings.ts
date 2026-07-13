import type { userSettings } from "../../db/schema";

/**
 * The one settings payload shape shared by /api/v1/me and /api/v1/me/settings
 * (PUT and PATCH), so the three responses can't drift apart.
 */
export function serializeSettings(settings: typeof userSettings.$inferSelect) {
  return {
    activeTrack: settings.activeTrack,
    timeZone: settings.timeZone,
    dailyGoal: settings.dailyGoal,
    remindersEnabled: settings.remindersEnabled,
    onboardedAt: settings.onboardedAt,
  };
}
