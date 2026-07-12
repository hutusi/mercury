"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/session";
import { localeRedirect } from "../i18n";
import { upsertLearnerProfileForUser } from "../services/profile";
import { setActiveTrackForUser, setRemindersEnabledForUser } from "../services/settings";

export async function completeOnboarding(input: { track: string; goal?: Record<string, unknown> }) {
  const user = await requireUser();
  const settings = await setActiveTrackForUser(user.id, input.track);
  // The profile row (with goalTrack) is created even when the goal step was
  // skipped, so the plan engine and AI prompt context always have a substrate.
  await upsertLearnerProfileForUser(user.id, {
    ...(input.goal ?? {}),
    goalTrack: settings.activeTrack,
  });
  await localeRedirect("/dashboard");
}

export async function setActiveTrack(track: string) {
  const user = await requireUser();
  await setActiveTrackForUser(user.id, track);
  // Track affects every list page — bust the whole router cache.
  revalidatePath("/", "layout");
}

export async function setRemindersEnabled(enabled: boolean) {
  const user = await requireUser();
  await setRemindersEnabledForUser(user.id, enabled);
  revalidatePath("/", "layout");
}
