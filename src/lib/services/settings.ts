import { sql } from "drizzle-orm";
import { z } from "zod";
import { TrackSchema } from "../../content/types";
import { db } from "../db";
import { userSettings } from "../db/schema";
import { DEFAULT_TIME_ZONE, isIanaTimeZone } from "../streak-core";
import { UpsertLearnerProfileSchema, upsertLearnerProfileWith } from "./profile";

export const TimeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine(isIanaTimeZone, "Invalid IANA timezone");

export const CompleteOnboardingSchema = z.object({
  track: TrackSchema,
  timeZone: TimeZoneSchema.default(DEFAULT_TIME_ZONE),
  goal: UpsertLearnerProfileSchema.omit({ goalTrack: true }).optional(),
});

export const UpdateSettingsSchema = z
  .object({
    timeZone: TimeZoneSchema.optional(),
    remindersEnabled: z.boolean().optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    message: "At least one setting is required",
  });

/** Atomic first-run write: settings and learner profile always land together. */
export async function completeOnboardingForUser(userId: string, input: unknown) {
  const { track, timeZone, goal } = CompleteOnboardingSchema.parse(input);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [settings] = await tx
      .insert(userSettings)
      .values({ userId, timeZone, onboardedAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          timeZone,
          onboardedAt: sql`coalesce(${userSettings.onboardedAt}, ${now})`,
          updatedAt: now,
        },
      })
      .returning();

    await upsertLearnerProfileWith(tx, userId, { ...goal, goalTrack: track });
    return settings;
  });
}

/**
 * Toggle study reminders (the dashboard nudge, later email/push). Upserts so
 * a pre-onboarding call — no settings row yet — can't explode.
 */
export async function setRemindersEnabledForUser(userId: string, enabled: unknown) {
  return updateSettingsForUser(userId, { remindersEnabled: enabled });
}

/** Partial preference update; unlike PUT this never changes onboarding state. */
export async function updateSettingsForUser(userId: string, input: unknown) {
  const patch = UpdateSettingsSchema.parse(input);
  const now = new Date();
  const values = {
    ...(patch.timeZone === undefined ? {} : { timeZone: patch.timeZone }),
    ...(patch.remindersEnabled === undefined ? {} : { remindersEnabled: patch.remindersEnabled }),
  };
  const [settings] = await db
    .insert(userSettings)
    .values({ userId, ...values, updatedAt: now })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...values, updatedAt: now },
    })
    .returning();
  return settings;
}
