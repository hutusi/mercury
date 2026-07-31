# Content Authoring Guide

All learning content is authored as YAML in the top-level `content/` directory, validated against the zod content model (`src/content/types.ts`), and loaded into Postgres by an idempotent seed script. The app never reads the YAML at runtime — pages and server actions query the seeded tables. This guide covers the model, the conventions, and the workflow for adding or editing content (see [ADR 0009](adr/0009-yaml-content-authoring.md) for why YAML).

## The content model

Schemas and types live in `src/content/types.ts`; `src/content/load.ts` reads and validates the YAML files and exposes the `all*` aggregates to the seed script and tests. Every content kind follows the bilingual convention: **learning material in English, scaffolding in Simplified Chinese** — titles carry both (`title` / `titleZh`), prompts carry both (`promptEn` / `promptZh`), explanations are Chinese (`explanationZh`), and checklists are `{ en, zh }` pairs.

| Kind       | File pattern                                                                                | Document shape     | Schema                                     |
| ---------- | ------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------ |
| Vocabulary | `content/vocab/{toeic,ielts,business}.yaml`                                                 | array of words     | `VocabWordSchema`                          |
| Reading    | `content/reading/{track}.yaml`                                                              | array of exercises | `ReadingExerciseSchema`                    |
| Listening  | `content/listening/{track}.yaml`                                                            | array of exercises | `ListeningExerciseSchema`                  |
| Writing    | `content/writing/{track}.yaml`                                                              | array of prompts   | `WritingPromptSchema`                      |
| Speaking   | `content/speaking/{track}.yaml`                                                             | array of prompts   | `SpeakingPromptSchema`                     |
| Mock exams | `content/exams/<track>-<paper>.yaml` (currently `{toeic,ielts}-{mini,standard,standard-2}`) | one exam object    | `MockExamSchema`                           |
| Books      | `content/books/<slug>/book.yaml` + `content/books/<slug>/chapters/<id>.yaml`                | one object each    | `BookManifestSchema` / `BookChapterSchema` |

New files must be registered in `src/content/load.ts` — file order there is deliberate and hardcoded (vocabulary `sort_order` derives from array position; never load by directory order).

## YAML authoring notes

- Indent with 2 spaces. Multi-paragraph prose (`passage`, `promptEn`, `modelAnswer`) uses literal block scalars (`|-`) with a blank line between paragraphs.
- The first line of every file is a `# yaml-language-server: $schema=…` directive pointing at the JSON Schemas in `content/.schemas/` — editors with the YAML language server (VS Code: the Red Hat YAML extension) validate and autocomplete as you type. Those schemas are generated from zod: run `bun run content:schemas` after changing `src/content/types.ts` (a unit test fails if you forget).
- Item order matters: vocabulary order is review order. Append new items; don't reshuffle.
- Quote strings that YAML would otherwise parse as something else (a value that is entirely digits, or a literal `null`/`true`). If you get it wrong, zod rejects the file with a pointed error at test/seed time — nothing bad reaches the DB.
- Duplicate keys in a mapping are a parse error, and Prettier formats the files (`bun run format`).

## Id conventions — ids are load-bearing

Ids are stable slugs: `toeic-w-001` (word), `ielts-r-002` (reading), `biz-l-001` (listening), `toeic-wr-001` (writing), `ielts-s-003` (speaking), `exam-toeic-mini` (exam). Exam internals use prefixed ids: sections (`toeic-mini-listening`), groups (`tm-lg1`), questions (`tm-l-q01`). Books nest hierarchically: book `book-oz`, chapter `oz-ch-01`, section `oz-ch-01-s1`, check-in `oz-ch-01-s1-c1`, quiz question `oz-ch-01-q1`.

**Never rename an id once shipped.** Progress rows reference them: `srs_cards.word_id`, `exercise_attempts.ref_id`, submissions' `prompt_id`, and mock-exam `answers` maps are keyed by question id. Renaming orphans user data. Exam attempts freeze a complete section snapshot when they start, so later edits cannot corrupt those attempts, but stable ids remain necessary for progress, mistakes, analytics, and cross-release continuity. Add new ids, don't recycle old ones.

## Authoring rules per kind

**Vocabulary** — headword, IPA in slashes, part-of-speech abbreviation (`n.`, `v.`, `phr.`), a learner-dictionary English definition (≤15 words), a concise Chinese translation, and an example sentence in a business/exam context with a natural Chinese rendering.

**Reading** — a passage (~180–350 words depending on track) plus 4-option MCQs. Explanations (`explanationZh`) are teaching content: quote the passage and say why distractors are wrong.

**Listening** — a `script` of `{ speaker, text }` lines where `speaker` is `"A"`, `"B"`, or `"narrator"`. Keep each line to 1–2 sentences: the fallback TTS player speaks **one utterance per line**, and Chrome silently cuts long utterances (~15s); the DashScope renderer also synthesizes per line (~600-char request cap). Speakers A and B get distinct voices in both paths.

**After editing listening/exam scripts or vocab headwords, regenerate the audio** ([ADR 0021](adr/0021-pregenerated-listening-audio.md), [0022](adr/0022-listening-audio-on-vercel-blob.md)): `bun run content:audio` (needs `BLOB_READ_WRITE_TOKEN` always and `DASHSCOPE_API_KEY` when something re-renders; idempotent — only changed scripts re-render, ~$0.10 per 10k characters) uploads MP3s to Vercel Blob and updates `content/audio-manifest.json` — commit the manifest (audio files are never committed; `public/audio/` is a gitignored local cache). Forgetting is safe but audible: the seed detects the stale hash, warns, and nulls `audio_url`, so the exercise falls back to browser TTS until someone regenerates. Superseded blobs are deliberately kept — deployed environments reference them until their seed runs; after the change has deployed **and** production has been reseeded, run `bun run content:audio:prune` to sweep unreferenced blobs.

**Writing** — `taskType` is an enum (`ielts_task1`, `ielts_task2`, `opinion_essay`, `business_email`, `business_report`) that selects the AI examiner persona in `src/lib/ai/prompts.ts`. `modelAnswer` must be genuinely good at the target length — it doubles as the fallback when AI grading is unavailable. `checklist` needs ≥3 bilingual self-assessment items.

**Speaking** — `partType` enum likewise selects the persona. `prepSeconds`/`speakSeconds` drive the recorder timers; match the real exam format (IELTS Part 1/3 have no prep; Part 2 has 60s). `modelAnswer` should read as natural speech.

**Mock exams** — `sections[]` (each `listening` or `reading`, with `durationSeconds`) → `groups[]` (a group carries a `script` for listening or a `passage` for reading) → 4-option `questions[]`. **Question ids must be unique across the whole exam** — they key the flat answer map on the attempt row. Every exam needs at least one listening and one reading section (the TOEIC estimator sums per kind). Distribute `correctIndex` across positions; clustering on one letter is a tell.

**Books** ([ADR 0024](adr/0024-book-reading-pregenerated-recall.md)) — track-agnostic extensive reading: a `book.yaml` manifest (bilingual titles, author, `descriptionZh`, CEFR level, genres, provenance in `source`, and the **ordered** `chapterFiles` list — array position is reading order, like vocab sort order) plus one YAML per chapter. A chapter is `sections[]` of prose (400–800 words each, `|-` block scalars, blank lines between paragraphs), each optionally carrying one `checkIn` MCQ anchored at its break, and a `quiz` of ≥3 end-of-chapter recall MCQs. Question ids must be unique across a chapter's check-ins **and** quiz combined (they share the attempt answer map and `mistake_states`). Register new book directories in `BOOK_DIRS` in `src/content/load.ts` — **array position is the library's difficulty ladder** (easiest first): the seed derives `books.sort_order` from it, and `/books` renders in that order grouped by CEFR band. The ladder is guidance, never a gate — there is no cross-book lock.

The authoring workflow is script-assisted, human-reviewed:

```bash
# 1. Skeletons. Preferred source: a cloned Standard Ebooks repo (proofed XHTML, one
#    file per chapter). --files is ordered — it doubles as story selection for
#    collected volumes and as reading order (fs order lies: chapter-10 < chapter-2).
bun run content:book-ingest -- --se-dir /tmp/h-g-wells_the-time-machine \
  --files chapter-1.xhtml,chapter-2.xhtml,epilogue.xhtml --slug the-time-machine --prefix ttm --book-id book-time-machine
#    Gutenberg plain-text fallback; --heading-regex overrides the "Chapter N" matcher
#    (capture group 1 = chapter number, optional group 2 = same-line title).
bun run content:book-ingest -- --file pg55.txt --slug the-wonderful-wizard-of-oz --prefix oz --book-id book-oz
# 2. Hand-adjust awkward section breaks; write book.yaml (its cefrLevel sets the
#    question-drafting difficulty).
# 3. Draft questions via the configured AI provider (rewrites the YAML). Invoke the
#    script directly when passing flags — `bun run content:book-questions -- --book …`
#    appends them to the trailing prettier step instead.
bun scripts/generate-book-questions.ts --book the-time-machine && bunx prettier --write content/books
# 4. REVIEW EVERY QUESTION before committing (checklist below). Only then register
#    the directory in BOOK_DIRS (skeletons fail the quiz ≥3 floor at load) — its
#    position is the ladder — and seed.
```

Review checklist for generated questions: the answer is truly stated in the text (re-read the section); exactly one option is defensible; `explanationZh` teaches (points at the text, dismisses the tempting distractor **by content, never by letter/position** — option order is script-assigned, and a content test enforces the position spread) rather than asserts; check-ins only reference their own section; `titleZh` follows the book's published translation conventions. Three answer tells surfaced in review, so check for them explicitly (the drafter warns on all three, and a content test caps the length skew): `summaryZh` must **not state any fact a question asks for** (readers see it first); quiz questions must **not repeat a check-in's fact** (its answer was revealed mid-read); the four options must be **similar in length and identically punctuated** — a uniquely long correct answer is gameable (test caps: ≤1.6× the longest distractor per question, ≤45% uniquely-longest pooled per book). Runtime never calls AI for books — what you commit is what learners get, so the review **is** the quality bar. Never regenerate a shipped chapter: its question ids key learner answer maps and mistakes. Wording-only edits to shipped questions and summaries are safe (ids and `correctIndex` untouched); never replace a shipped question with a different fact — recorded mistakes would silently point at a different question.

## Validation

Three layers enforce the same invariants:

- The editor, live: the `$schema` directive validates shape as you type (advisory — zod is the authority).
- `bun run test` → `src/content/content.test.ts`: every file loads through `src/content/load.ts` (zod parse with file-scoped errors), id uniqueness, per-exam question-id uniqueness, section-kind coverage, per-track coverage of all five practice areas, and the book invariants (chapter/section ids unique, per-chapter question ids unique across check-ins + quiz, `bookId` cross-checks, correct-answer position spread). It also guards the pipeline itself: app code must not import the loader (runtime content comes from Postgres), and the committed JSON Schemas must match the zod model.
- `bun run db:seed` re-validates before writing and refuses duplicate ids.

MCQs are exactly 4 options with `correctIndex` in 0–3 (schema-enforced).

## Seed workflow

```bash
# 1. Edit/add content in content/…, register new files in src/content/load.ts
# 2. Validate without touching the DB
bun run test
# 3. Load into the Postgres database (idempotent upsert by id — re-runs are safe)
bun run db:seed
```

`db:seed` runs via `bunx tsx` under Node against the `DATABASE_URL` Postgres. It validates the complete corpus first, then upserts every content table in one database transaction; any failure rolls the whole seed back. Edits to existing ids update rows in place; removed items are _not_ deleted from the DB (write a migration if that ever matters).
