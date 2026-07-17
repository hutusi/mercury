import { eq } from "drizzle-orm";
import { cache } from "react";
import type { Track } from "../content/types";
import { requireUser } from "./auth/session";
import { localeRedirect } from "./i18n";
import { db } from "./db";
import { userSettings } from "./db/schema";
import { getLearnerProfile } from "./queries/profile";

export const getSettings = cache(async (userId: string) => {
  return db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
});

/**
 * The one onboarding predicate, shared by the (app) layout and both guards:
 * onboarding completed (settings.onboardedAt, written only by the atomic
 * onboarding flow) AND a goal track on the learner profile. Requiring both
 * keeps piecemeal PATCHes (profile goalTrack + a settings upsert) from
 * synthesizing an onboarded account.
 */
export const getOnboardedState = cache(async (userId: string) => {
  const [settings, profile] = await Promise.all([getSettings(userId), getLearnerProfile(userId)]);
  if (!settings?.onboardedAt || !profile?.goalTrack) return null;
  return { settings, goalTrack: profile.goalTrack };
});

/** Guard for pages/actions that need an onboarded user; redirects otherwise. */
export async function requireOnboarded(): Promise<{
  user: Awaited<ReturnType<typeof requireUser>>;
  goalTrack: Track;
  dailyGoal: number;
  remindersEnabled: boolean;
  timeZone: string;
}> {
  const user = await requireUser();
  const onboarded = await getOnboardedState(user.id);
  if (!onboarded) return localeRedirect("/onboarding");
  return {
    user,
    goalTrack: onboarded.goalTrack,
    dailyGoal: onboarded.settings.dailyGoal,
    remindersEnabled: onboarded.settings.remindersEnabled,
    timeZone: onboarded.settings.timeZone,
  };
}
