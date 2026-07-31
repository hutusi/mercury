# 0024. Book reading with pre-generated recall questions

Date: 2026-07-28

## Status

Accepted. Amended 2026-07-31: the "drafted offline by an authoring-time AI
script" mechanism below was replaced by hand-authoring in a Claude Code
session against the chapter prose. The decision itself — runtime never
generates questions, and what is committed is what learners get — is
unchanged; only how the committed YAML gets written changed. See
[docs/CONTENT.md](../CONTENT.md#authoring-rules-per-kind).

## Context

Every existing surface is _intensive_ practice — the longest reading passage
is ~370 words. Extensive reading is the missing complement, and retrieval
practice (the testing effect) is among the best-supported findings in
learning science. A book read chapter by chapter also creates a multi-week
engagement arc no daily drill provides. The long-term shape is two tiers —
a free curated public-domain library and a premium bring-your-own-book
upload — but the app has no billing, entitlement, or file-upload
infrastructure today, so the MVP proves the mechanic with the free tier
while keeping the schema BYOB-tolerant.

## Decision

- **Runtime never generates questions.** Check-ins and end-of-chapter quiz
  questions are drafted offline by an authoring-time AI script, reviewed by
  a human, committed as YAML, and seeded like all other content. This keeps
  the marginal cost of a reader at zero, works keyless (no ADR 0006
  degradation surface — the fallback content _is_ the content), and puts
  question quality under review instead of shipping unvetted model output.
- **Chapter content model**: one YAML file per chapter under
  `content/books/<slug>/chapters/`, prose in `|-` block scalars split into
  sections of roughly 400–800 words, each section optionally anchoring one
  low-stakes check-in; a `book.yaml` manifest owns chapter order via the
  `chapterFiles` array (array position is load-bearing, like vocab
  `sortOrder`). Chapters land in a `book_chapters` table with the full
  sections/quiz jsonb — sanitized before every client read, mirroring
  `mock_exams.sections`.
- **Books are track-agnostic.** Difficulty is a CEFR level plus genre tags,
  not a toeic/ielts/business track — a novel is not exam-track content, and
  the library is visible to every learner regardless of `goalTrack`.
- **Sequential hard lock, completion-gated.** Chapter N+1 is unreadable until
  chapter N's quiz is _submitted_ — any score completes the chapter. The
  mistakes notebook is the remediation loop, not a mastery gate; gating a B1
  reader on recall scores would punish exactly the user we want reading
  daily. Chapter 1 is always unlocked.
- **Check-ins are stateless; the quiz is the persisted event.** Answering a
  check-in calls a server reveal (correct index + `explanationZh`) that
  writes no rows — no mistakes, no skill signal, no streak. The
  end-of-chapter quiz is taken with the prose hidden (that is the recall
  point), lands in a dedicated `book_quiz_attempts` table, feeds the
  mistakes notebook and the `reading` skill estimate, and earns the streak.
- **Dedicated attempts table, no progress table.** `exercise_attempts.track`
  stays `NOT NULL` (ADR 0019 invariants intact) by giving book quizzes their
  own FK-clean table; completion, unlock state, and "current chapter" derive
  from those rows with one bounded grouped query, the same way reading
  best-scores derive today. Section-level resume is a future
  `book_reading_positions` table nothing currently depends on.

## Consequences

- New content kind (`BookManifestSchema`/`BookChapterSchema`), tables
  (`books`, `book_chapters`, `book_quiz_attempts` — migration 0019), and a
  books section in the daily plan and mistakes notebook. `mistake_states`
  learns a `book_quiz` kind with `track = NULL` (track-agnostic mistakes are
  always visible).
- Authoring a book is real work even with AI drafting: every generated
  question is reviewed before commit. Ids are stable and seeding is
  append-only, so a book can launch partially and grow without migrations.
- BYOB later means: an upload path, EPUB parsing, per-user `origin = 'user'`
  book rows (the column and owner FK exist from day one), runtime generation
  with the ADR 0018 budget machinery, and an entitlement story — none of
  which this MVP forecloses.
