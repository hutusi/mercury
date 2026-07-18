# 0021. Pre-generated neural audio for listening, browser TTS as fallback

Date: 2026-07-18

## Status

Accepted — storage clause (committed files under `public/`) superseded by
[ADR 0022](0022-listening-audio-on-vercel-blob.md); generation, hashing, seed
linking, and degradation are unchanged.

## Context

Every listening exercise was voiced live on the learner's device by the
browser Web Speech API — the architecture explicitly recorded "no audio
hosting". Even after ranking browser voices quality-first, the result is
device-dependent and, on many setups, plainly robotic. For a product whose
listening features train the learner's ear, synthetic prosody is a liability:
TOEIC/IELTS audio sounds like recorded humans, and our practice audio should
too.

The listening corpus is small, static, and id-stable: YAML scripts seeded by
slug id, a few dozen exercises. Rendering audio at authoring time — not at
request time — fits that shape. A DashScope key already exists for the Bailian
AI provider, and DashScope's `qwen3-tts-flash` offers natural English voices
at negligible cost for a corpus this size (~$0.10 per 10k characters; a full
regeneration is well under a dollar).

## Decision

- **Authoring-time generation, not runtime.** `bun run content:audio`
  (`scripts/generate-listening-audio.ts`) renders each listening exercise's
  script to one MP3: per line, DashScope `qwen3-tts-flash` (native
  `multimodal-generation` endpoint — not the OpenAI-compatible path the chat
  transport uses) returns a 24h-lived WAV URL that the script downloads,
  stitches with short inter-line silences, and encodes to mono MP3 with
  `@breezystack/lamejs` (dev-only dependency). Voices are cast per speaker
  (A male, B female, narrator news-anchor) in `src/content/audio-hash.ts`.
- **Files are committed under `public/audio/listening/`, not object storage.**
  ~1 MB per exercise. Vercel's CDN serves them from the app's own origin
  (mainland-China reachable), and dev/CI/e2e/preview all work with zero
  runtime infrastructure and zero API keys. The trigger to migrate to
  Blob/OSS is per-word vocabulary audio (thousands of files) — not more
  listening exercises.
- **A content hash links audio to the exact script that produced it.**
  `content/audio-manifest.json` records, per exercise, a hash of
  (model, voice cast, ordered speaker/text pairs) plus the file path
  (`<id>.<hash12>.mp3`, immutable and cache-friendly). Generation is
  idempotent: matching hash + existing file → skip; editing one script
  re-renders one exercise; recasting a voice re-renders all.
- **The seed resolves the manifest; the DB carries only a nullable
  `audio_url`.** At seed time the hash is recomputed against the current
  script: match → link, mismatch or missing → `NULL` plus a warning. Stale
  audio can therefore never play against an edited script.
- **Browser TTS is the degradation path, mirroring the AI degradation
  contract.** `audio_url` absent, the file 404ing, or `<audio>` erroring →
  the player falls back to the existing Web Speech path. No key, no files,
  no network — the feature still works end to end.

## Consequences

- Reverses the "no audio hosting" line in ARCHITECTURE.md. The repo now
  carries generated binaries (~20–35 MB, growing slowly with content); the
  hash-idempotent generator keeps churn to genuinely-changed exercises.
- Authoring workflow grows a step: after editing listening YAML, run
  `bun run content:audio` (needs `DASHSCOPE_API_KEY`) and commit MP3s +
  manifest together. Forgetting is safe — seed nulls the stale link and the
  exercise degrades to browser TTS. Keyless contributors are never blocked;
  CI never calls DashScope.
- Audio files are unauthenticated static assets. Accepted: the script text
  already ships to clients before answering (the TTS fallback needs it), so
  the audio reveals nothing the transcript didn't.
- Scope is practice listening exercises. Mock-exam listening groups
  (`exam:<examId>:<groupId>` manifest keys, jsonb overlay, `sanitizeSections`
  passthrough) and vocabulary audio are named follow-ups; flashcards stay on
  browser TTS meanwhile.
