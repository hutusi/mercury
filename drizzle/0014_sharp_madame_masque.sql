ALTER TABLE "mistake_states" DROP CONSTRAINT "mistake_states_wrong_count_check";--> statement-breakpoint
ALTER TABLE "vocab_quiz_sessions" DROP CONSTRAINT "vocab_quiz_sessions_source_check";--> statement-breakpoint
ALTER TABLE "mistake_states" ALTER COLUMN "last_wrong_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vocab_quiz_sessions" ADD COLUMN "source_mistake_at" timestamp with time zone;--> statement-breakpoint
-- Legacy re-tests did not snapshot a mistake generation. Give them a value
-- that cannot match the real wrong timestamp so they fail closed as stale.
UPDATE "vocab_quiz_sessions"
SET "source_mistake_at" = "created_at" - interval '1 microsecond'
WHERE "purpose" = 'mistake_retest';--> statement-breakpoint
ALTER TABLE "mistake_states" ADD CONSTRAINT "mistake_states_lifecycle_check" CHECK (("mistake_states"."wrong_count" = 0 and "mistake_states"."last_wrong_at" is null and "mistake_states"."cleared_at" is not null) or ("mistake_states"."wrong_count" >= 1 and "mistake_states"."last_wrong_at" is not null));--> statement-breakpoint
ALTER TABLE "mistake_states" ADD CONSTRAINT "mistake_states_wrong_count_check" CHECK ("mistake_states"."wrong_count" >= 0);--> statement-breakpoint
ALTER TABLE "vocab_quiz_sessions" ADD CONSTRAINT "vocab_quiz_sessions_source_check" CHECK (("vocab_quiz_sessions"."purpose" = 'practice' and "vocab_quiz_sessions"."source_word_id" is null and "vocab_quiz_sessions"."source_mistake_at" is null) or ("vocab_quiz_sessions"."purpose" = 'mistake_retest' and "vocab_quiz_sessions"."source_word_id" is not null and "vocab_quiz_sessions"."source_mistake_at" is not null));
