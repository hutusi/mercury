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
 * Guard for pages/actions that need an onboarded user. The goal track on the
 * learner profile is the onboarding invariant — it is set atomically with the
 * settings row and can be changed but never cleared.
 */
export async function requireOnboarded(): Promise<{
  user: Awaited<ReturnType<typeof requireUser>>;
  goalTrack: Track;
  dailyGoal: number;
  remindersEnabled: boolean;
  timeZone: string;
}> {
  const user = await requireUser();
  const [settings, profile] = await Promise.all([getSettings(user.id), getLearnerProfile(user.id)]);
  if (!settings || !profile?.goalTrack) return localeRedirect("/onboarding");
  return {
    user,
    goalTrack: profile.goalTrack,
    dailyGoal: settings.dailyGoal,
    remindersEnabled: settings.remindersEnabled,
    timeZone: settings.timeZone,
  };
}
