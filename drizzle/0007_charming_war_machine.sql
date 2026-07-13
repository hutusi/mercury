CREATE TABLE "vocab_quiz_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"track" text NOT NULL,
	"purpose" text NOT NULL,
	"source_word_id" text,
	"questions" jsonb NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vocab_quiz_sessions" ADD CONSTRAINT "vocab_quiz_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_quiz_sessions" ADD CONSTRAINT "vocab_quiz_sessions_source_word_id_vocab_words_id_fk" FOREIGN KEY ("source_word_id") REFERENCES "public"."vocab_words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vocab_quiz_sessions_user_created_idx" ON "vocab_quiz_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "vocab_quiz_sessions_expires_idx" ON "vocab_quiz_sessions" USING btree ("expires_at");