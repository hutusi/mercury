-- Three shipped book quiz questions were rewritten to test a different fact
-- while keeping their ids (oz-ch-07-q2, oz-ch-08-q5, sm-ch-12-q6). Each had
-- re-asked something its own section check-in already revealed mid-read, which
-- docs/CONTENT.md rules out, so the question had to change rather than the id.
--
-- Reusing an id is normally forbidden precisely because mistake rows key on it:
-- retestMistake() looks the question up inside the CURRENT book_chapters.quiz
-- jsonb, and the seed upserts that jsonb wholesale. Left alone, a learner
-- retesting one of these would be shown — and graded against — a question they
-- never answered, silently. Drop the affected rows so the mistake disappears
-- instead of mutating into something else.
--
-- Scoped to the three (ref_id, question_id) pairs, so no other mistake is
-- touched. DELETE is idempotent; replaying this migration is a no-op.
--
-- book_quiz_attempts deliberately keeps its rows: its answers jsonb is never
-- read back for display (only aggregate score/chapter/completed_at), so the
-- historical score stays meaningful.

-- 1. Active mistake state — what the notebook lists and retests.
DELETE FROM "mistake_states"
WHERE "kind" = 'book_quiz'
  AND ("ref_id", "question_id") IN (
    ('oz-ch-07', 'oz-ch-07-q2'),
    ('oz-ch-08', 'oz-ch-08-q5'),
    ('sm-ch-12', 'sm-ch-12-q6')
  );--> statement-breakpoint

-- 2. The clear log, which would otherwise credit a clear against a question
--    that no longer asks what was cleared.
DELETE FROM "mistake_clears"
WHERE "kind" = 'book_quiz'
  AND ("ref_id", "question_id") IN (
    ('oz-ch-07', 'oz-ch-07-q2'),
    ('oz-ch-08', 'oz-ch-08-q5'),
    ('sm-ch-12', 'sm-ch-12-q6')
  );
