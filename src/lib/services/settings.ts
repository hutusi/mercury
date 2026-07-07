import { TrackSchema } from "../../content/types";
import { db } from "../db";
import { userSettings } from "../db/schema";

/**
 * Set the user's active learning track (first call doubles as onboarding).
 * Accepts unknown input: TrackSchema.parse is the validation boundary for
 * both the server action and the API route.
 */
export async function setActiveTrackForUser(userId: string, track: unknown) {
  const activeTrack = TrackSchema.parse(track);
  const now = new Date();
  const [settings] = await db
    .insert(userSettings)
    .values({
      userId,
      activeTrack,
      onboardedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { activeTrack, updatedAt: now },
    })
    .returning();
  return settings;
}
