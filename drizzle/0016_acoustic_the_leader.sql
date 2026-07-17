-- The track is no longer an app mode: learner_profiles.goal_track is the only
-- track state. Backfill it from active_track before the column drops, so every
-- onboarded user still passes the goal-track onboarding gate.

-- 1. Onboarded users who never got a profile row (pre-profile accounts): seed
--    one whose jsonb matches defaultSkillEstimates(null, now) / emptyCoachMemo().
INSERT INTO "learner_profiles" ("user_id", "goal_track", "daily_minutes", "skill_estimates", "coach_memo", "created_at", "updated_at")
SELECT s."user_id", s."active_track", 20,
  (SELECT jsonb_object_agg(k, jsonb_build_object(
      'estimate', 40,
      'confidence', 'low',
      'updatedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
    FROM unnest(ARRAY['listening','reading','writing','speaking','vocab']) AS k),
  '{"issues":[],"strengths":[]}'::jsonb, now(), now()
FROM "user_settings" s
WHERE s."active_track" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "learner_profiles" p WHERE p."user_id" = s."user_id");--> statement-breakpoint

-- 2. Profiles whose goal lagged the active track (goal never set): adopt it.
UPDATE "learner_profiles" p SET "goal_track" = s."active_track", "updated_at" = now()
FROM "user_settings" s
WHERE s."user_id" = p."user_id" AND p."goal_track" IS NULL AND s."active_track" IS NOT NULL;--> statement-breakpoint

-- 3. Legacy rows onboarded before onboarded_at existed.
UPDATE "user_settings" SET "onboarded_at" = COALESCE("onboarded_at", "updated_at")
WHERE "active_track" IS NOT NULL;--> statement-breakpoint

ALTER TABLE "user_settings" DROP CONSTRAINT "user_settings_active_track_check";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "active_track";
