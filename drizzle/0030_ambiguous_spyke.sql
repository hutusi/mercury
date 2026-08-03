ALTER TABLE "book_chapters" ADD COLUMN "quiz_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- Backfill from the jsonb the column denormalizes — already-seeded databases
-- must not read 0 until their next reseed. Idempotent.
UPDATE "book_chapters" SET "quiz_count" = jsonb_array_length("quiz");
