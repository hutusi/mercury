"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth/session";
import { localeRedirect } from "../i18n";
import { setActiveTrackForUser, setRemindersEnabledForUser } from "../services/settings";

export async function completeOnboarding(track: string) {
  const user = await requireUser();
  await setActiveTrackForUser(user.id, track);
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
