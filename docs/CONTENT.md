# Content Authoring Guide

All learning content is authored as typed TypeScript in `src/content/`, validated with zod, and loaded into SQLite by an idempotent seed script. This guide covers the model, the conventions, and the workflow for adding or editing content.

## The content model

Schemas and types live in `src/content/types.ts`. Every content kind follows the bilingual convention: **learning material in English, scaffolding in Simplified Chinese** — titles carry both (`title` / `titleZh`), prompts carry both (`promptEn` / `promptZh`), explanations are Chinese (`explanationZh`), and checklists are `{ en, zh }` pairs.

| Kind       | File pattern                      | Export                | Schema                    |
| ---------- | --------------------------------- | --------------------- | ------------------------- |
| Vocabulary | `vocab/{toeic,ielts,business}.ts` | `toeicVocab` etc.     | `VocabWordSchema`         |
| Reading    | `reading/{track}.ts`              | `toeicReading` etc.   | `ReadingExerciseSchema`   |
| Listening  | `listening/{track}.ts`            | `toeicListening` etc. | `ListeningExerciseSchema` |
| Writing    | `writing/{track}.ts`              | `toeicWriting` etc.   | `WritingPromptSchema`     |
| Speaking   | `speaking/{track}.ts`             | `toeicSpeaking` etc.  | `SpeakingPromptSchema`    |
| Mock exams | `exams/{toeic,ielts}-mini.ts`     | `toeicMiniExam` etc.  | `MockExamSchema`          |

New collections must be registered in `src/content/index.ts` (the seed script and tests read the `all*` aggregates).

## Id conventions — ids are load-bearing

Ids are stable slugs: `toeic-w-001` (word), `ielts-r-002` (reading), `biz-l-001` (listening), `toeic-wr-001` (writing), `ielts-s-003` (speaking), `exam-toeic-mini` (exam). Exam internals use prefixed ids: sections (`toeic-mini-listening`), groups (`tm-lg1`), questions (`tm-l-q01`).

**Never rename an id once shipped.** Progress rows reference them: `srs_cards.word_id`, `exercise_attempts.ref_id`, submissions' `prompt_id`, and mock-exam `answers` maps are keyed by question id. Renaming orphans user data; editing an in-flight exam's question ids corrupts active attempts. Add new ids, don't recycle old ones.

## Authoring rules per kind

**Vocabulary** — headword, IPA in slashes, part-of-speech abbreviation (`n.`, `v.`, `phr.`), a learner-dictionary English definition (≤15 words), a concise Chinese translation, and an example sentence in a business/exam context with a natural Chinese rendering.

**Reading** — a passage (~180–350 words depending on track) plus 4-option MCQs. Explanations (`explanationZh`) are teaching content: quote the passage and say why distractors are wrong.

**Listening** — a `script` of `{ speaker, text }` lines where `speaker` is `"A"`, `"B"`, or `"narrator"`. Keep each line to 1–2 sentences: the TTS player speaks **one utterance per line**, and Chrome silently cuts long utterances (~15s). Speakers A and B get distinct voices.

**Writing** — `taskType` is an enum (`ielts_task1`, `ielts_task2`, `opinion_essay`, `business_email`, `business_report`) that selects the AI examiner persona in `src/lib/ai/prompts.ts`. `modelAnswer` must be genuinely good at the target length — it doubles as the fallback when AI grading is unavailable. `checklist` needs ≥3 bilingual self-assessment items.

**Speaking** — `partType` enum likewise selects the persona. `prepSeconds`/`speakSeconds` drive the recorder timers; match the real exam format (IELTS Part 1/3 have no prep; Part 2 has 60s). `modelAnswer` should read as natural speech.

**Mock exams** — `sections[]` (each `listening` or `reading`, with `durationSeconds`) → `groups[]` (a group carries a `script` for listening or a `passage` for reading) → 4-option `questions[]`. **Question ids must be unique across the whole exam** — they key the flat answer map on the attempt row. Every exam needs at least one listening and one reading section (the TOEIC estimator sums per kind). Distribute `correctIndex` across positions; clustering on one letter is a tell.

## Validation

Two layers enforce the same invariants:

- `bun run test` → `src/content/content.test.ts`: zod parse of every collection, id uniqueness, per-exam question-id uniqueness, section-kind coverage, per-track coverage of all five practice areas.
- `bun run db:seed` re-validates before writing and refuses duplicate ids.

MCQs are exactly 4 options with `correctIndex` in 0–3 (schema-enforced).

## Seed workflow

```bash
# 1. Edit/add content in src/content/…, register new collections in index.ts
# 2. Validate without touching the DB
bun run test
# 3. Load into the local database (idempotent upsert by id — re-runs are safe)
bun run db:seed
```

`db:seed` runs via `bunx tsx` (Node) because Bun cannot load better-sqlite3. Edits to existing ids update rows in place; removed items are _not_ deleted from the DB (write a migration if that ever matters).
