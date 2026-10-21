ALTER TABLE "review_logs" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "prev_ease_factor" double precision;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "prev_repetitions" integer;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "prev_lapses" integer;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "prev_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "prev_last_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "created_card" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "review_logs_request_idx" ON "review_logs" USING btree ("user_id","request_id") WHERE "review_logs"."request_id" is not null;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_prev_state_check" CHECK (("review_logs"."prev_ease_factor" is null and "review_logs"."prev_repetitions" is null and "review_logs"."prev_lapses" is null and "review_logs"."prev_due_at" is null and "review_logs"."prev_last_reviewed_at" is null) or ("review_logs"."prev_ease_factor" is not null and "review_logs"."prev_repetitions" is not null and "review_logs"."prev_lapses" is not null and "review_logs"."prev_due_at" is not null));