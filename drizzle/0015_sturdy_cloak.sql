ALTER TABLE "exercise_attempts" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD COLUMN "input_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_attempts_request_idx" ON "exercise_attempts" USING btree ("user_id","request_id") WHERE "exercise_attempts"."request_id" is not null;