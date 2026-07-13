CREATE INDEX "exercise_attempts_user_kind_ref_idx" ON "exercise_attempts" USING btree ("user_id","kind","ref_id");--> statement-breakpoint
CREATE INDEX "mock_exam_attempts_user_status_idx" ON "mock_exam_attempts" USING btree ("user_id","status","completed_at");--> statement-breakpoint
CREATE INDEX "speaking_submissions_user_prompt_idx" ON "speaking_submissions" USING btree ("user_id","prompt_id","created_at");--> statement-breakpoint
CREATE INDEX "writing_submissions_user_prompt_idx" ON "writing_submissions" USING btree ("user_id","prompt_id","created_at");