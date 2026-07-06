# ADR 0009: Content authored as YAML, validated by zod

**Status:** Accepted (2026-07)

## Context

Learning content — 150 vocabulary words, reading/listening exercises, writing/speaking prompts,
two mock exams — was hand-authored as ~5,000 lines of typed TypeScript literals in `src/content/`.
Runtime never read those files: every page and server action queries Postgres, and the TS existed
solely to feed `bun run db:seed`. That made TypeScript a poor fit for what the files actually are:
data. Authors got a compiler where they needed a validator, multi-paragraph passages lived inside
template literals in the code tree, content edits looked like code edits in review, and the format
was hostile to eventual non-developer authoring.

Ids are load-bearing throughout (`srs_cards.word_id`, submissions' `prompt_id`,
`mock_exam_attempts.exam_id`, answer maps keyed by question id), so any format change must
preserve them exactly, and the client must still never see exam answer keys outside review.

## Decision

Author content as **YAML files in a top-level `content/` directory**, one file per track and kind
(exams one file per exam), validated by the **same zod schemas** (`src/content/types.ts`) that
type the DB's jsonb columns and the UI props. A tooling-only loader (`src/content/load.ts`)
reads the files with hardcoded order and zod-validates each one; the seed pipeline, the Postgres
runtime store, and every id are unchanged. A one-off converter serialized the TS to YAML, and a
temporary round-trip test deep-equalled the loader output against the old TS aggregates before
the TS was deleted (lossless by construction, ids byte-identical).

- **Editor feedback without giving up zod:** JSON Schemas are generated from zod
  (`bun run content:schemas`, draft-07 for yaml-language-server) into `content/.schemas/` and
  referenced by a `$schema` directive at the top of every file. zod stays the single source of
  truth; a unit test fails if the committed schemas drift from `types.ts`.
- **Loader discipline:** `load.ts` touches `node:fs` and must never be imported by app code —
  a unit test scans `src/app`, `src/components`, and `src/lib` and allows only the seed script
  and tests. Exam integrity is untouched: answer keys still live server-side in Postgres and
  clients still only receive `sanitizeSections()` output.
- **Why YAML over JSON:** the content is prose-heavy and bilingual. Block scalars keep
  multi-paragraph passages readable and diffable where JSON forces `\n\n`-escaped one-liners;
  YAML carries comments (topic dividers survived the migration); and a top-level JSON array
  cannot reference a `$schema`. YAML's coercion foot-guns are defused here: the model has no
  boolean fields, `yaml` parses with the 1.2 core schema, and every parse is zod-gated with
  file-scoped errors.
- **Alternatives rejected:** _keeping TS_ (compiler ≠ validator; blocks non-dev editing);
  _Markdown/MDX_ (wrong shape for MCQ trees and answer keys); _content-layer libraries_
  (they compile content into the build, but this app consumes content from the DB);
  _DB-as-source-of-truth with an admin UI_ (the eventual non-developer answer, but a much
  bigger build — nothing here blocks it, since the zod schemas and the seeded tables remain
  the contract).

## Consequences

- Content edits are data diffs, reviewable without TypeScript knowledge; the seed workflow
  (`bun run test` → `bun run db:seed`) is unchanged.
- Schema evolution has one extra step: after editing `src/content/types.ts`, run
  `bun run content:schemas` (enforced by test).
- Type errors became runtime validation errors — caught at test/seed time rather than in the
  editor by `tsc`, with the `$schema` directive recovering most of the as-you-type feedback.
- A future admin UI would write to the same Postgres tables and could export YAML, or retire
  the files entirely by superseding this ADR.
