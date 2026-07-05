CREATE TABLE "activity_days" (
	"user_id" text NOT NULL,
	"day" text NOT NULL,
	CONSTRAINT "activity_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "exercise_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"track" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listening_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"title" text NOT NULL,
	"title_zh" text NOT NULL,
	"style" text NOT NULL,
	"script" jsonb NOT NULL,
	"questions" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_exam_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exam_id" text NOT NULL,
	"track" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"current_section_index" integer DEFAULT 0 NOT NULL,
	"section_deadlines" jsonb NOT NULL,
	"answers" jsonb NOT NULL,
	"section_scores" jsonb,
	"raw_score" integer,
	"total_questions" integer NOT NULL,
	"estimate" jsonb,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mock_exams" (
	"id" text PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"title" text NOT NULL,
	"title_zh" text NOT NULL,
	"description_zh" text NOT NULL,
	"sections" jsonb NOT NULL,
	"total_questions" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"title" text NOT NULL,
	"title_zh" text NOT NULL,
	"genre" text NOT NULL,
	"passage" text NOT NULL,
	"suggested_minutes" integer NOT NULL,
	"questions" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_id" text NOT NULL,
	"grade" integer NOT NULL,
	"previous_interval_days" double precision NOT NULL,
	"new_interval_days" double precision NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaking_prompts" (
	"id" text PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"part_type" text NOT NULL,
	"title" text NOT NULL,
	"title_zh" text NOT NULL,
	"prompt_en" text NOT NULL,
	"prompt_zh" text NOT NULL,
	"prep_seconds" integer NOT NULL,
	"speak_seconds" integer NOT NULL,
	"model_answer" text NOT NULL,
	"checklist" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaking_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prompt_id" text NOT NULL,
	"transcript" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"status" text NOT NULL,
	"feedback" jsonb,
	"model" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "srs_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"word_id" text NOT NULL,
	"ease_factor" double precision DEFAULT 2.5 NOT NULL,
	"interval_days" double precision DEFAULT 0 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"active_track" text,
	"daily_goal" integer DEFAULT 20 NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocab_words" (
	"id" text PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"topic" text NOT NULL,
	"headword" text NOT NULL,
	"ipa" text NOT NULL,
	"pos" text NOT NULL,
	"definition_en" text NOT NULL,
	"translation_zh" text NOT NULL,
	"example_en" text NOT NULL,
	"example_zh" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_prompts" (
	"id" text PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"task_type" text NOT NULL,
	"title" text NOT NULL,
	"title_zh" text NOT NULL,
	"prompt_en" text NOT NULL,
	"prompt_zh" text NOT NULL,
	"min_words" integer NOT NULL,
	"suggested_minutes" integer NOT NULL,
	"model_answer" text NOT NULL,
	"checklist" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prompt_id" text NOT NULL,
	"text" text NOT NULL,
	"word_count" integer NOT NULL,
	"status" text NOT NULL,
	"feedback" jsonb,
	"model" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_days" ADD CONSTRAINT "activity_days_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "exercise_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_exam_attempts" ADD CONSTRAINT "mock_exam_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_exam_attempts" ADD CONSTRAINT "mock_exam_attempts_exam_id_mock_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."mock_exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_card_id_srs_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."srs_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_submissions" ADD CONSTRAINT "speaking_submissions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_submissions" ADD CONSTRAINT "speaking_submissions_prompt_id_speaking_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."speaking_prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_word_id_vocab_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."vocab_words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_submissions" ADD CONSTRAINT "writing_submissions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_submissions" ADD CONSTRAINT "writing_submissions_prompt_id_writing_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."writing_prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_attempts_user_idx" ON "exercise_attempts" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "listening_exercises_track_idx" ON "listening_exercises" USING btree ("track");--> statement-breakpoint
CREATE INDEX "mock_exam_attempts_user_idx" ON "mock_exam_attempts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "reading_exercises_track_idx" ON "reading_exercises" USING btree ("track");--> statement-breakpoint
CREATE INDEX "review_logs_user_idx" ON "review_logs" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "speaking_prompts_track_idx" ON "speaking_prompts" USING btree ("track");--> statement-breakpoint
CREATE INDEX "speaking_submissions_user_idx" ON "speaking_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "srs_cards_user_word_idx" ON "srs_cards" USING btree ("user_id","word_id");--> statement-breakpoint
CREATE INDEX "srs_cards_user_due_idx" ON "srs_cards" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "vocab_words_track_idx" ON "vocab_words" USING btree ("track");--> statement-breakpoint
CREATE INDEX "writing_prompts_track_idx" ON "writing_prompts" USING btree ("track");--> statement-breakpoint
CREATE INDEX "writing_submissions_user_idx" ON "writing_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");