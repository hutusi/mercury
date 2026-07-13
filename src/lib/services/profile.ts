import { eq } from "drizzle-orm";
import { z } from "zod";
import { TrackSchema } from "../../content/types";
import { db, type DbExecutor } from "../db";
import { learnerProfiles } from "../db/schema";
import {
  applySkillSignal,
  defaultSkillEstimates,
  emptyCoachMemo,
  isUnratedSkillSeed,
  mergeCoachMemo,
  SELF_RATED_LEVELS,
  type MemoUpdate,
  type SkillSignal,
} from "../learner-model-core";

/**
 * Learner-profile mutations. Goals are client-writable; skillEstimates and
 * coachMemo are server-owned — they only change through the signal/memo
 * helpers below, so the PATCH schema deliberately excludes them.
 */

export const UpsertLearnerProfileSchema = z.object({
  goalTrack: TrackSchema.nullish(),
  // TOEIC 10–990; IELTS as band×10 (55–90). One range covers both.
  targetScore: z.number().int().min(10).max(990).nullish(),
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  dailyMinutes: z.number().int().min(5).max(180).optional(),
  selfRatedLevel: z.enum(SELF_RATED_LEVELS).nullish(),
});

/**
 * Partial upsert: absent fields stay untouched on update, null clears.
 * The first insert seeds skill estimates from the self-rating (or the
 * conservative default); later self-rating edits never reseed — by then the
 * estimates have converged from real signals.
 */
export async function upsertLearnerProfileForUser(userId: string, input: unknown) {
  const patch = UpsertLearnerProfileSchema.parse(input);
  return db.transaction((tx) => upsertLearnerProfileWith(tx, userId, patch));
}

/** Transaction-aware profile upsert used by atomic onboarding. */
export async function upsertLearnerProfileWith(
  executor: DbExecutor,
  userId: string,
  patch: z.infer<typeof UpsertLearnerProfileSchema>,
) {
  const nowDate = new Date();

  const set: Partial<typeof learnerProfiles.$inferInsert> = { updatedAt: nowDate };
  if (patch.goalTrack !== undefined) set.goalTrack = patch.goalTrack;
  if (patch.targetScore !== undefined) set.targetScore = patch.targetScore;
  if (patch.examDate !== undefined) set.examDate = patch.examDate;
  if (patch.dailyMinutes !== undefined) set.dailyMinutes = patch.dailyMinutes;
  if (patch.selfRatedLevel !== undefined) set.selfRatedLevel = patch.selfRatedLevel;

  const [inserted] = await executor
    .insert(learnerProfiles)
    .values({
      userId,
      goalTrack: patch.goalTrack ?? null,
      targetScore: patch.targetScore ?? null,
      examDate: patch.examDate ?? null,
      dailyMinutes: patch.dailyMinutes ?? 20,
      selfRatedLevel: patch.selfRatedLevel ?? null,
      skillEstimates: defaultSkillEstimates(patch.selfRatedLevel ?? null, nowDate),
      coachMemo: emptyCoachMemo(),
      updatedAt: nowDate,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;

  // Atomic onboarding creates an unrated profile before the optional goals
  // step. Let that first later rating replace the conservative bootstrap, but
  // never overwrite estimates after a real signal (or after a prior rating).
  const [existing] = await executor
    .select()
    .from(learnerProfiles)
    .where(eq(learnerProfiles.userId, userId))
    .for("update")
    .limit(1);
  if (!existing) throw new Error("learner profile upsert failed");
  if (
    patch.selfRatedLevel != null &&
    existing.selfRatedLevel === null &&
    isUnratedSkillSeed(existing.skillEstimates)
  ) {
    set.skillEstimates = defaultSkillEstimates(patch.selfRatedLevel, nowDate);
  }

  const [profile] = await executor
    .update(learnerProfiles)
    .set(set)
    .where(eq(learnerProfiles.userId, userId))
    .returning();
  return profile;
}

/** Default row for users who predate the profile table (or skipped onboarding). */
export async function ensureLearnerProfile(userId: string) {
  const existing = await db.query.learnerProfiles.findFirst({
    where: eq(learnerProfiles.userId, userId),
  });
  if (existing) return existing;
  const nowDate = new Date();
  const [inserted] = await db
    .insert(learnerProfiles)
    .values({
      userId,
      skillEstimates: defaultSkillEstimates(null, nowDate),
      coachMemo: emptyCoachMemo(),
      updatedAt: nowDate,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;
  // Lost a concurrent-insert race: the row exists now.
  const row = await db.query.learnerProfiles.findFirst({
    where: eq(learnerProfiles.userId, userId),
  });
  if (!row) throw new Error("learner profile upsert failed");
  return row;
}

/**
 * Fold one practice/exam/AI signal into the skill estimates. Callers hook
 * this after their own mutation commits and must guard it (try/catch-log):
 * a profile update may never fail the learning action that produced it.
 */
export async function applySkillSignalForUser(userId: string, signal: SkillSignal) {
  await applyLearnerOutcomeForUser(userId, { signals: [signal] });
}

export interface LearnerOutcome {
  signals?: readonly SkillSignal[];
  memoUpdate?: MemoUpdate;
}

/**
 * Fold a complete learning outcome under one profile-row lock. This keeps
 * concurrent exercise, exam, and grading signals from overwriting each other
 * and merges a grading memo in the same serialized update.
 */
export async function applyLearnerOutcomeForUser(userId: string, outcome: LearnerOutcome) {
  if (!outcome.signals?.length && !outcome.memoUpdate) return;

  await db.transaction(async (tx) => {
    const nowDate = new Date();
    await tx
      .insert(learnerProfiles)
      .values({
        userId,
        skillEstimates: defaultSkillEstimates(null, nowDate),
        coachMemo: emptyCoachMemo(),
        updatedAt: nowDate,
      })
      .onConflictDoNothing();

    const [profile] = await tx
      .select({
        skillEstimates: learnerProfiles.skillEstimates,
        coachMemo: learnerProfiles.coachMemo,
      })
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, userId))
      .for("update")
      .limit(1);
    if (!profile) throw new Error("learner profile upsert failed");

    const skillEstimates = (outcome.signals ?? []).reduce(
      (estimates, signal) => applySkillSignal(estimates, signal, nowDate),
      profile.skillEstimates,
    );
    const coachMemo = outcome.memoUpdate
      ? mergeCoachMemo(profile.coachMemo, outcome.memoUpdate, nowDate)
      : profile.coachMemo;

    await tx
      .update(learnerProfiles)
      .set({ skillEstimates, coachMemo, updatedAt: nowDate })
      .where(eq(learnerProfiles.userId, userId));
  });
}

/**
 * Guarded variant for post-mutation hooks: a learner-profile update may never
 * fail the learning action that produced the signal, so this logs and moves on.
 */
export async function recordSkillSignalSafely(userId: string, signal: SkillSignal) {
  await recordLearnerOutcomeSafely(userId, { signals: [signal] });
}

/** Guarded post-mutation adapter for one or more signals and an optional memo. */
export async function recordLearnerOutcomeSafely(userId: string, outcome: LearnerOutcome) {
  try {
    await applyLearnerOutcomeForUser(userId, outcome);
  } catch (error) {
    console.error("[profile] learner outcome failed", error);
  }
}

/** Guarded memo merge for post-grading hooks (same rule as skill signals). */
export async function mergeCoachMemoSafely(userId: string, update: MemoUpdate) {
  await recordLearnerOutcomeSafely(userId, { memoUpdate: update });
}

/** Merge a grading call's memoUpdate into the coach memo (same guard rule). */
export async function mergeCoachMemoForUser(userId: string, update: MemoUpdate) {
  await applyLearnerOutcomeForUser(userId, { memoUpdate: update });
}
