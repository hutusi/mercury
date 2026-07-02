"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TrackSchema } from "../../content/types";
import { requireUser } from "../auth/session";
import { db } from "../db";
import { userSettings } from "../db/schema";

async function upsertActiveTrack(userId: string, track: string) {
  const activeTrack = TrackSchema.parse(track);
  const now = new Date();
  await db
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
    });
}

export async function completeOnboarding(track: string) {
  const user = await requireUser();
  await upsertActiveTrack(user.id, track);
  redirect("/dashboard");
}

export async function setActiveTrack(track: string) {
  const user = await requireUser();
  await upsertActiveTrack(user.id, track);
  // Track affects every list page — bust the whole router cache.
  revalidatePath("/", "layout");
}
