ALTER TABLE "mock_exam_attempts" ADD COLUMN "sections_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "mock_exam_attempts" ADD COLUMN "abandoned_at" timestamp with time zone;--> statement-breakpoint
UPDATE "mock_exam_attempts" attempt
SET "sections_snapshot" = exam."sections"
FROM "mock_exams" exam
WHERE exam."id" = attempt."exam_id" AND attempt."sections_snapshot" IS NULL;--> statement-breakpoint
ALTER TABLE "mock_exam_attempts" ALTER COLUMN "sections_snapshot" SET NOT NULL;--> statement-breakpoint
UPDATE "mock_exam_attempts"
SET "status" = 'abandoned', "abandoned_at" = coalesce("completed_at", "started_at")
WHERE "status" = 'expired';
