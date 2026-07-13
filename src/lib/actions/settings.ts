"use server";

import { TrackSchema } from "../../content/types";
import { requireUser } from "../auth/session";
import { localeRedirect } from "../i18n";
import { UpsertLearnerProfileSchema, upsertLearnerProfileForUser } from "../services/profile";
import { setActiveTrackForUser, setRemindersEnabledForUser } from "../services/settings";

export async function completeOnboarding(input: { track: string; goal?: Record<string, unknown> }) {
  const user = await requireUser();
  // Validate the full payload before any write: a malformed goal must fail
  // here with nothing committed, not leave a track-onboarded account whose
  // goals were silently dropped.
  const goal = UpsertLearnerProfileSchema.parse({
    ...(input.goal ?? {}),
    goalTrack: TrackSchema.parse(input.track),
  });
  await setActiveTrackForUser(user.id, input.track);
  // The profile row (with goalTrack) is created even when the goal step was
  // skipped, so the plan engine and AI prompt context always have a substrate.
  await upsertLearnerProfileForUser(user.id, goal);
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
