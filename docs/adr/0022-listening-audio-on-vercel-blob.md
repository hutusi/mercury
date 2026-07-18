# 0022. Listening audio moves from the repo to Vercel Blob

Date: 2026-07-18

## Status

Accepted (supersedes the storage clause of [ADR 0021](0021-pregenerated-listening-audio.md))

## Context

ADR 0021 committed generated MP3s under `public/audio/listening/` — the right
call for shipping the feature (zero infrastructure, keyless CI), with the
recorded trade-off that git carries regenerable binaries. The cost showed up
immediately: two full generations put ~20 MB into history, and every future
render or recast compounds it. As listening material grows, clone and deploy
weight grow with it, for files a script can always re-produce.

## Decision

- **Audio lives in a Vercel Blob store** (`mercury-audio`, sin1 — colocated
  with the app region). `content:audio` uploads each render to the canonical
  pathname `audio/listening/<id>.<hash>.mp3` (public access, `audio/mpeg`)
  and verifies every manifest entry with a `head()` sweep.
  `BLOB_READ_WRITE_TOKEN` is tooling-time only — the deployed app never talks
  to the Blob API.
- **Blob deletion is deferred to an explicit prune step.** Generation never
  deletes: deployed environments keep referencing the previous hash until
  their database is reseeded, so deleting at generation time would degrade
  live audio to browser TTS days before any deploy.
  `bun run content:audio:prune` sweeps blobs no longer referenced by the
  manifest (superseded hashes and removed exercises) — run it only after the
  manifest has deployed and the prod seed has run. Until then, superseded
  renders cost pennies of storage.
- **The manifest + hash pipeline is unchanged and storage-agnostic.** The
  committed `content/audio-manifest.json` remains the seed's source of truth;
  the DB keeps storing origin-relative paths. The only runtime addition is
  `MERCURY_AUDIO_BASE_URL` (the store origin), prefixed onto the stored path
  in `src/lib/queries/listening.ts`. Switching providers later (e.g. Aliyun
  OSS + CDN) means swapping the upload target and one env var — no manifest,
  DB, or player changes.
- **Client caching rides on immutability.** Pathnames embed the content hash,
  so URLs never change meaning; blobs upload with `cacheControlMaxAge` of one
  year. First listen downloads; replays and revisits play from the browser's
  disk cache with zero network. (Offline/Service-Worker pre-download is a
  deliberate non-goal until offline learning is a product goal.)
- **`public/audio/listening/` becomes a gitignored local render cache.**
  Fresh renders land there as well as on Blob; a cache file whose hash still
  matches uploads without re-synthesis (this is also how the 18 existing
  files migrated at zero DashScope cost). Dev without any env serves the
  cache same-origin; dev without cache or env degrades to browser TTS.
- **e2e stays hermetic** with a committed 1-second MP3 fixture
  (`e2e/fixtures/listening-sample.mp3`) fulfilled via Playwright routing —
  no spec touches the network or needs a token.

## Consequences

- Repo history keeps the ~20 MB already committed (shared remote — not worth
  a history rewrite); the working tree and all future history stay
  binary-free.
- **Accepted risk: mainland-China reachability of
  `*.public.blob.vercel-storage.com` is unverified.** Spot-check from a
  mainland network early; if it disappoints, the recorded switch path (OSS
  behind a CDN domain, same manifest) is the remedy.
- `content:audio` now always requires `BLOB_READ_WRITE_TOKEN` (even the
  idempotency check reads Blob). Keyless contributors still never run it —
  editing scripts stays safe, the seed nulls stale links, exercises degrade.
- Unit tests no longer verify audio existence (that check moved into the
  generator's tooling-time sweep); they keep enforcing the manifest's
  canonical id/hash↔file mapping.
- `MERCURY_AUDIO_BASE_URL` must be set in Vercel (production/preview) before
  a deploy that relies on Blob audio; unset it and the app cleanly degrades
  to browser TTS rather than 404ing.
