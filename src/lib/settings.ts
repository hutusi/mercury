import { eq } from "drizzle-orm";
import { cache } from "react";
import type { Track } from "../content/types";
import { requireUser } from "./auth/session";
import { localeRedirect } from "./i18n";
import { db } from "./db";
import { userSettings } from "./db/schema";

export const getSettings = cache(async (userId: string) => {
  return db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
});

/**
 * Guard for pages/actions that need a chosen learning track.
 * Redirects to onboarding until the user has picked one.
 */
export async function requireTrack(): Promise<{
  user: Awaited<ReturnType<typeof requireUser>>;
  track: Track;
  dailyGoal: number;
  remindersEnabled: boolean;
  timeZone: string;
}> {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  if (!settings?.activeTrack) return localeRedirect("/onboarding");
  return {
    user,
    track: settings.activeTrack,
    dailyGoal: settings.dailyGoal,
    remindersEnabled: settings.remindersEnabled,
    timeZone: settings.timeZone,
  };
}
