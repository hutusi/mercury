ALTER TABLE "mistake_clears" DROP CONSTRAINT "mistake_clears_kind_check";--> statement-breakpoint
ALTER TABLE "mistake_states" DROP CONSTRAINT "mistake_states_track_check";--> statement-breakpoint
ALTER TABLE "mistake_states" DROP CONSTRAINT "mistake_states_kind_check";--> statement-breakpoint
ALTER TABLE "mistake_states" ALTER COLUMN "track" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mistake_clears" ADD CONSTRAINT "mistake_clears_kind_check" CHECK ("mistake_clears"."kind" in ('reading', 'listening', 'vocab_quiz', 'exam', 'book_quiz'));--> statement-breakpoint
ALTER TABLE "mistake_states" ADD CONSTRAINT "mistake_states_track_check" CHECK ("mistake_states"."track" is null or "mistake_states"."track" in ('toeic', 'ielts', 'business'));--> statement-breakpoint
ALTER TABLE "mistake_states" ADD CONSTRAINT "mistake_states_kind_check" CHECK ("mistake_states"."kind" in ('reading', 'listening', 'vocab_quiz', 'exam', 'book_quiz'));