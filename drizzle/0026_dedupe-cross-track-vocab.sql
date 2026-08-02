-- 25 vocab words were exact cross-pack duplicates of a surviving twin — same
-- sense, near-identical definition (e.g. ielts-w-094 "broadcast" duplicated
-- toeic-w-192). ADR 0029 makes vocabulary scenario-first and headwords unique
-- across packs, so the weaker twin of each pair was removed from content.
-- (check-in / launch / backlog keep two entries each: genuine polysemy.)
--
-- The seed only upserts (docs/CONTENT.md: removed items are not deleted from
-- the DB — write a migration), so without this DELETE the duplicates would
-- stay user-visible forever: listed on /vocabulary, dealt as study cards, and
-- drawn as quiz answers.
--
-- Cascades: vocab_words → srs_cards (onDelete cascade) → review_logs, plus
-- retest quiz sessions via source_word_id. Losing the learner's card for the
-- deleted twin is accepted — the surviving twin keeps its own card.
--
-- mistake_states / mistake_clears reference word ids as plain text
-- (question_id is polymorphic across kinds, so a real FK is impossible), and
-- an orphaned vocab_quiz row is a PHANTOM: /mistakes silently hides it while
-- countActiveMistakes still counts it — a dashboard badge no user action can
-- clear. Racing writers make explicit sweeps insufficient: PRACTICE sessions
-- escape the word cascade (their check constraint forces source_word_id
-- NULL; drawn word ids live only in the questions jsonb), the grade
-- transaction locks its session row FOR UPDATE while inserting mistakes for
-- those jsonb ids, and this migration runs in vercel-build MINUTES before
-- the guarded runtime is promoted — the old, guardless deployment keeps
-- grading in that window.
--
-- So statement 0 EMULATES the impossible FK, both directions, with FK-grade
-- locking:
--   * BEFORE INSERT on mistake_states takes FOR KEY SHARE on the word row —
--     exactly what a real FK check acquires, so a concurrent word DELETE
--     blocks until the insert commits — and silently drops vocab_quiz rows
--     whose word is gone (RETURN NULL skips the row even under ON CONFLICT
--     DO UPDATE).
--   * AFTER DELETE on vocab_words sweeps that word's mistake_states and
--     mistake_clears rows — the cascade half, which also serves every
--     FUTURE word deletion: no explicit mistake cleanup needed again.
-- The word DELETE below therefore cascades its own mistake sweep. The
-- session purge and the live-word filter in vocab-quiz.ts (readable,
-- testable) remain as defense-in-depth; sessions are 30-minute throwaway
-- ephemera, a mid-quiz learner restarts.
--
-- exercise_attempts deliberately keeps its rows: the answers jsonb is never
-- read back for display, only the aggregate score, so history stays
-- meaningful. Every statement is idempotent; replaying is a no-op.

-- 0. The emulated FK. Drizzle-kit neither models nor drops triggers, so
--    these live here (documented in ADR 0029).
CREATE OR REPLACE FUNCTION vocab_quiz_mistake_requires_live_word() RETURNS trigger AS $$
BEGIN
  IF NEW.kind = 'vocab_quiz' THEN
    PERFORM 1 FROM vocab_words WHERE id = NEW.question_id FOR KEY SHARE;
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS mistake_states_vocab_word_guard ON "mistake_states";--> statement-breakpoint

CREATE TRIGGER mistake_states_vocab_word_guard
BEFORE INSERT ON "mistake_states"
FOR EACH ROW EXECUTE FUNCTION vocab_quiz_mistake_requires_live_word();--> statement-breakpoint

CREATE OR REPLACE FUNCTION vocab_word_sweep_mistakes() RETURNS trigger AS $$
BEGIN
  DELETE FROM mistake_states WHERE kind = 'vocab_quiz' AND question_id = OLD.id;
  DELETE FROM mistake_clears WHERE kind = 'vocab_quiz' AND question_id = OLD.id;
  RETURN OLD;
END $$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS vocab_words_mistake_sweep ON "vocab_words";--> statement-breakpoint

CREATE TRIGGER vocab_words_mistake_sweep
AFTER DELETE ON "vocab_words"
FOR EACH ROW EXECUTE FUNCTION vocab_word_sweep_mistakes();--> statement-breakpoint

-- 1. The duplicate words themselves. Cascades srs_cards → review_logs and
--    retest sessions via source_word_id; the new trigger sweeps each word's
--    mistake_states / mistake_clears rows.
DELETE FROM "vocab_words"
WHERE "id" IN (
  'toeic-w-168',
  'ielts-w-063', 'ielts-w-073', 'ielts-w-094', 'ielts-w-121', 'ielts-w-123',
  'ielts-w-131', 'ielts-w-134', 'ielts-w-177', 'ielts-w-187', 'ielts-w-188',
  'biz-w-069', 'biz-w-102', 'biz-w-106', 'biz-w-107', 'biz-w-114',
  'biz-w-124', 'biz-w-127', 'biz-w-129', 'biz-w-134', 'biz-w-138',
  'biz-w-143', 'biz-w-155', 'biz-w-165', 'biz-w-166'
);--> statement-breakpoint

-- 2. All quiz sessions — waits out in-flight grades holding session row
--    locks; any doomed-word outcome they committed was already swept by the
--    delete trigger, and later completions hit the insert guard.
DELETE FROM "vocab_quiz_sessions";
