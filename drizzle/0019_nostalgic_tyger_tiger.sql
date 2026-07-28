CREATE TABLE "book_chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"title" text NOT NULL,
	"title_zh" text NOT NULL,
	"summary_zh" text,
	"sections" jsonb NOT NULL,
	"quiz" jsonb NOT NULL,
	"word_count" integer NOT NULL,
	CONSTRAINT "book_chapters_order_check" CHECK ("book_chapters"."sort_order" >= 1),
	CONSTRAINT "book_chapters_word_count_check" CHECK ("book_chapters"."word_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "book_quiz_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"request_id" text,
	"input_hash" text,
	CONSTRAINT "book_quiz_attempts_score_check" CHECK ("book_quiz_attempts"."total" > 0 and "book_quiz_attempts"."score" between 0 and "book_quiz_attempts"."total"),
	CONSTRAINT "book_quiz_attempts_duration_check" CHECK ("book_quiz_attempts"."duration_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"title_zh" text NOT NULL,
	"author" text NOT NULL,
	"author_zh" text,
	"description_zh" text NOT NULL,
	"cefr_level" text NOT NULL,
	"genres" jsonb NOT NULL,
	"source" text NOT NULL,
	"chapter_count" integer NOT NULL,
	"word_count" integer NOT NULL,
	"origin" text DEFAULT 'seeded' NOT NULL,
	"owner_user_id" text,
	CONSTRAINT "books_cefr_check" CHECK ("books"."cefr_level" in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
	CONSTRAINT "books_origin_check" CHECK ("books"."origin" in ('seeded', 'user')),
	CONSTRAINT "books_owner_check" CHECK (("books"."origin" = 'seeded' and "books"."owner_user_id" is null) or ("books"."origin" = 'user' and "books"."owner_user_id" is not null)),
	CONSTRAINT "books_counts_check" CHECK ("books"."chapter_count" > 0 and "books"."word_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_quiz_attempts" ADD CONSTRAINT "book_quiz_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_quiz_attempts" ADD CONSTRAINT "book_quiz_attempts_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_quiz_attempts" ADD CONSTRAINT "book_quiz_attempts_chapter_id_book_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."book_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "book_chapters_book_order_idx" ON "book_chapters" USING btree ("book_id","sort_order");--> statement-breakpoint
CREATE INDEX "book_quiz_attempts_user_book_idx" ON "book_quiz_attempts" USING btree ("user_id","book_id","chapter_id");--> statement-breakpoint
CREATE INDEX "book_quiz_attempts_user_idx" ON "book_quiz_attempts" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "book_quiz_attempts_request_idx" ON "book_quiz_attempts" USING btree ("user_id","request_id") WHERE "book_quiz_attempts"."request_id" is not null;