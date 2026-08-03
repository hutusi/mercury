CREATE INDEX "book_quiz_attempts_chapter_idx" ON "book_quiz_attempts" USING btree ("book_id","chapter_id");--> statement-breakpoint
CREATE INDEX "mistake_clears_vocab_word_idx" ON "mistake_clears" USING btree ("question_id") WHERE "mistake_clears"."kind" = 'vocab_quiz';--> statement-breakpoint
CREATE INDEX "mistake_states_vocab_word_idx" ON "mistake_states" USING btree ("question_id") WHERE "mistake_states"."kind" = 'vocab_quiz';--> statement-breakpoint
CREATE INDEX "review_logs_card_idx" ON "review_logs" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "srs_cards_word_idx" ON "srs_cards" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "vocab_quiz_sessions_source_word_idx" ON "vocab_quiz_sessions" USING btree ("source_word_id");