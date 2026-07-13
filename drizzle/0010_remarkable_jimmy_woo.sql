CREATE TABLE "ai_grading_requests" (
	"user_id" text NOT NULL,
	"request_id" text NOT NULL,
	"kind" text NOT NULL,
	"scope" text NOT NULL,
	"input_hash" text NOT NULL,
	"day" text NOT NULL,
	"status" text NOT NULL,
	"claim_id" text NOT NULL,
	"submission_id" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "ai_grading_requests_user_id_request_id_pk" PRIMARY KEY("user_id","request_id")
);
--> statement-breakpoint
CREATE TABLE "ai_usage_days" (
	"user_id" text NOT NULL,
	"day" text NOT NULL,
	"grading_calls" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_usage_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "ai_grading_requests" ADD CONSTRAINT "ai_grading_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_days" ADD CONSTRAINT "ai_usage_days_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_grading_requests_user_day_idx" ON "ai_grading_requests" USING btree ("user_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_grading_requests_active_scope_idx" ON "ai_grading_requests" USING btree ("user_id","scope") WHERE "ai_grading_requests"."status" = 'in_progress';