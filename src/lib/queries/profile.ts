import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "../db";
import { learnerProfiles } from "../db/schema";

/** Learner profile row, or null for users who haven't onboarded goals yet. */
export const getLearnerProfile = cache(async (userId: string) => {
  const profile = await db.query.learnerProfiles.findFirst({
    where: eq(learnerProfiles.userId, userId),
  });
  return profile ?? null;
});
