# 0023. Neural audio for exam sections and vocab headwords; examples stay on-device

Date: 2026-07-18

## Status

Accepted (extends [ADR 0021](0021-pregenerated-listening-audio.md) / [0022](0022-listening-audio-on-vercel-blob.md))

## Context

Practice listening got pre-generated neural audio; two surfaces still spoke
through browser TTS. Mock-exam listening sections are the most
quality-sensitive audio in the product — single-play, score-bearing, and the
exam-prep acquisition funnel. Flashcards speak two things: the headword and
its example sentence.

## Decision

- **Exam listening groups get full pre-generated audio**, same voice cast and
  pipeline as exercises (`exam:<examId>:<groupId>` manifest keys,
  `/audio/exams/…`). The seed writes the relative path into the sections
  jsonb, so ADR 0017's immutable attempt snapshots carry it for free —
  attempts started before audio existed simply lack the field and keep the
  TTS fallback. `sanitizeSections` passes the composed URL through; the
  shared player's single-play accounting already covers audio mode.
- **Vocab audio covers the headword only** (`vocab:<wordId>`,
  `/audio/vocab/…`, one short utterance in a single consistent voice —
  Jennifer). The headword is where pronunciation fidelity is the product: it
  sits beside the IPA and learners mimic it; ~300 words cost ~$0.03 to
  render. **Example sentences deliberately stay on browser TTS**: they are
  context support rather than pronunciation drilling, they churn far more
  often than headwords (each edit would invalidate a render), and skipping
  them halves the file count.
- **Quiz surfaces are deliberately excluded.** Quiz payloads are built from
  `vocab-quiz-core`'s minimal inputs on a separate path, so the new card
  field cannot leak; speaking quiz prompts would be a deliberate future
  feature, not a side effect.
- The generator becomes `scripts/generate-audio.ts` — one skip/reuse/upload
  job runner over all three content sources, same manifest, same deferred
  `content:audio:prune` semantics.

## Consequences

- One `content:audio` run renders everything; one prod `db:seed` links
  everything (exam URLs live in jsonb, vocab URLs in a new nullable
  `vocab_words.audio_url` — migration 0018).
- Word audio at this scale (~300 files, a few MB) is comfortably within the
  Blob design; the old "vocab audio forces a storage migration" trigger from
  ADR 0021 was resolved by ADR 0022 before it fired.
- If example-sentence audio is ever wanted, it is a config + loop addition
  under a new `vocab-example:` namespace — nothing structural.
