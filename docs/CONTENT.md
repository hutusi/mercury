# Content Authoring Guide

All learning content is authored as YAML in the top-level `content/` directory, validated against the zod content model (`src/content/types.ts`), and loaded into Postgres by an idempotent seed script. The app never reads the YAML at runtime — pages and server actions query the seeded tables. This guide covers the model, the conventions, and the workflow for adding or editing content (see [ADR 0009](adr/0009-yaml-content-authoring.md) for why YAML).

## The content model

Schemas and types live in `src/content/types.ts`; `src/content/load.ts` reads and validates the YAML files and exposes the `all*` aggregates to the seed script and tests. Every content kind follows the bilingual convention: **learning material in English, scaffolding in Simplified Chinese** — titles carry both (`title` / `titleZh`), prompts carry both (`promptEn` / `promptZh`), explanations are Chinese (`explanationZh`), and checklists are `{ en, zh }` pairs.

| Kind       | File pattern                                       | Document shape     | Schema                    |
| ---------- | -------------------------------------------------- | ------------------ | ------------------------- |
| Vocabulary | `content/vocab/{toeic,ielts,business}.yaml`        | array of words     | `VocabWordSchema`         |
| Reading    | `content/reading/{track}.yaml`                     | array of exercises | `ReadingExerciseSchema`   |
| Listening  | `content/listening/{track}.yaml`                   | array of exercises | `ListeningExerciseSchema` |
| Writing    | `content/writing/{track}.yaml`                     | array of prompts   | `WritingPromptSchema`     |
| Speaking   | `content/speaking/{track}.yaml`                    | array of prompts   | `SpeakingPromptSchema`    |
| Mock exams | `content/exams/{toeic,ielts}-{mini,standard}.yaml` | one exam object    | `MockExamSchema`          |

New files must be registered in `src/content/load.ts` — file order there is deliberate and hardcoded (vocabulary `sort_order` derives from array position; never load by directory order).

## YAML authoring notes

- Indent with 2 spaces. Multi-paragraph prose (`passage`, `promptEn`, `modelAnswer`) uses literal block scalars (`|-`) with a blank line between paragraphs.
- The first line of every file is a `# yaml-language-server: $schema=…` directive pointing at the JSON Schemas in `content/.schemas/` — editors with the YAML language server (VS Code: the Red Hat YAML extension) validate and autocomplete as you type. Those schemas are generated from zod: run `bun run content:schemas` after changing `src/content/types.ts` (a unit test fails if you forget).
- Item order matters: vocabulary order is review order. Append new items; don't reshuffle.
- Quote strings that YAML would otherwise parse as something else (a value that is entirely digits, or a literal `null`/`true`). If you get it wrong, zod rejects the file with a pointed error at test/seed time — nothing bad reaches the DB.
- Duplicate keys in a mapping are a parse error, and Prettier formats the files (`bun run format`).

## Id conventions — ids are load-bearing

Ids are stable slugs: `toeic-w-001` (word), `ielts-r-002` (reading), `biz-l-001` (listening), `toeic-wr-001` (writing), `ielts-s-003` (speaking), `exam-toeic-mini` (exam). Exam internals use prefixed ids: sections (`toeic-mini-listening`), groups (`tm-lg1`), questions (`tm-l-q01`).

**Never rename an id once shipped.** Progress rows reference them: `srs_cards.word_id`, `exercise_attempts.ref_id`, submissions' `prompt_id`, and mock-exam `answers` maps are keyed by question id. Renaming orphans user data. Exam attempts freeze a complete section snapshot when they start, so later edits cannot corrupt those attempts, but stable ids remain necessary for progress, mistakes, analytics, and cross-release continuity. Add new ids, don't recycle old ones.

## Authoring rules per kind

**Vocabulary** — headword, IPA in slashes, part-of-speech abbreviation (`n.`, `v.`, `phr.`), a learner-dictionary English definition (≤15 words), a concise Chinese translation, and an example sentence in a business/exam context with a natural Chinese rendering.

**Reading** — a passage (~180–350 words depending on track) plus 4-option MCQs. Explanations (`explanationZh`) are teaching content: quote the passage and say why distractors are wrong.

**Listening** — a `script` of `{ speaker, text }` lines where `speaker` is `"A"`, `"B"`, or `"narrator"`. Keep each line to 1–2 sentences: the TTS player speaks **one utterance per line**, and Chrome silently cuts long utterances (~15s). Speakers A and B get distinct voices.

**Writing** — `taskType` is an enum (`ielts_task1`, `ielts_task2`, `opinion_essay`, `business_email`, `business_report`) that selects the AI examiner persona in `src/lib/ai/prompts.ts`. `modelAnswer` must be genuinely good at the target length — it doubles as the fallback when AI grading is unavailable. `checklist` needs ≥3 bilingual self-assessment items.

**Speaking** — `partType` enum likewise selects the persona. `prepSeconds`/`speakSeconds` drive the recorder timers; match the real exam format (IELTS Part 1/3 have no prep; Part 2 has 60s). `modelAnswer` should read as natural speech.

**Mock exams** — `sections[]` (each `listening` or `reading`, with `durationSeconds`) → `groups[]` (a group carries a `script` for listening or a `passage` for reading) → 4-option `questions[]`. **Question ids must be unique across the whole exam** — they key the flat answer map on the attempt row. Every exam needs at least one listening and one reading section (the TOEIC estimator sums per kind). Distribute `correctIndex` across positions; clustering on one letter is a tell.

## Validation

Three layers enforce the same invariants:

- The editor, live: the `$schema` directive validates shape as you type (advisory — zod is the authority).
- `bun run test` → `src/content/content.test.ts`: every file loads through `src/content/load.ts` (zod parse with file-scoped errors), id uniqueness, per-exam question-id uniqueness, section-kind coverage, per-track coverage of all five practice areas. It also guards the pipeline itself: app code must not import the loader (runtime content comes from Postgres), and the committed JSON Schemas must match the zod model.
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
