CREATE UNIQUE INDEX "book_chapters_book_id_id_idx" ON "book_chapters" USING btree ("book_id","id");--> statement-breakpoint
ALTER TABLE "book_quiz_attempts" DROP CONSTRAINT "book_quiz_attempts_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "book_quiz_attempts" DROP CONSTRAINT "book_quiz_attempts_chapter_id_book_chapters_id_fk";
--> statement-breakpoint
ALTER TABLE "book_quiz_attempts" ADD CONSTRAINT "book_quiz_attempts_book_chapter_fk" FOREIGN KEY ("book_id","chapter_id") REFERENCES "public"."book_chapters"("book_id","id") ON DELETE cascade ON UPDATE no action;
