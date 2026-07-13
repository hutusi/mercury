"use server";

import { requireUser } from "../auth/session";
import { localeRedirect } from "../i18n";
import {
  completeOnboardingForUser,
  setActiveTrackForUser,
  setRemindersEnabledForUser,
} from "../services/settings";

export async function completeOnboarding(input: {
  track: string;
  timeZone?: string;
  goal?: Record<string, unknown>;
}) {
  const user = await requireUser();
  await completeOnboardingForUser(user.id, input);
  await localeRedirect("/dashboard");
}

// Neither settings action calls revalidatePath: revalidating the root layout
// inside a server action wedges the caller's awaited transition indefinitely
// under next start (client `pending` never settles even though the response
// completes — reproduced 9/9 warm). Every page renders dynamically, so
// freshness comes from the callers issuing router.refresh() in a separate,
// non-gating transition instead.

export async function setActiveTrack(track: string) {
  const user = await requireUser();
  await setActiveTrackForUser(user.id, track);
}

export async function setRemindersEnabled(enabled: boolean) {
  const user = await requireUser();
  await setRemindersEnabledForUser(user.id, enabled);
}
