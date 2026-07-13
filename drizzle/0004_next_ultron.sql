CREATE TABLE "learner_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"goal_track" text,
	"target_score" integer,
	"exam_date" text,
	"daily_minutes" integer DEFAULT 20 NOT NULL,
	"self_rated_level" text,
	"skill_estimates" jsonb NOT NULL,
	"coach_memo" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;