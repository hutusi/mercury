# 0029. Personal collections are unfiltered; the track filter is a catalog concept

Date: 2026-08-02

## Status

Accepted, amends [ADR 0020](0020-track-as-goal-and-content-filter.md)

## Context

ADR 0020 put the All/TOEIC/IELTS/Business filter chips on every list surface
with a goal-track default. On content catalogs that default is right: the
catalog is the library, the goal is what you came for, and the chips are
deliberately the only door to other tracks' content (the daily plan never
crosses tracks).

On the two **personal collections** the same default was a trap. The
vocabulary overview, the study queue, and the mistakes notebook list what the
learner _owns_ — cards they started and questions they got wrong, on whatever
track they practiced. A goal-track default silently hid due cards and
mistakes from other tracks; the dashboard already had to paper over it by
deep-linking `?track=all` so its all-tracks counts matched the lists behind
them. A filter on one's own review debt has no product value — you owe what
you owe.

## Decision

- **Vocabulary (overview + study) and mistakes render no track filter.** The
  overview counts and word list, the due-card queue, and the notebook always
  cover every track. The web pages ignore `?track=`.
- **New words still start on the goal track.** `getStudyQueue` filters its
  two halves independently: due cards unfiltered, the new-word top-up
  goal-track only — an unfiltered top-up would follow raw seed order across
  tracks, and starting new material is goal-directed (same rule as the daily
  plan and the quiz).
- **Quiz entry defaults to the goal.** The overview's quiz link carries no
  track; the single-track quiz (ADR 0020) resolves it to the goal. Deep links
  with `?track=` still work.
- **Catalogs are unchanged.** Reading, listening, writing, speaking, and
  exams keep the chips, defaults, and semantics of ADR 0020.
- **The v1 API is unchanged.** `/vocab/overview`, `/vocab/study-queue`, and
  `/mistakes` keep `?track=` with the goal-track default — the contract is
  pinned and native clients pass explicit params. The web and API defaults
  now deliberately diverge on these three reads.

## Consequences

- Dashboard due-words/mistakes counts match the lists by construction; the
  `?track=all` deep links are gone.
- A learner cannot narrow the notebook or study queue to one track on the
  web. Accepted: the collections are small and the filter's cost (hidden
  reviews) outweighed narrowing.
- The web can no longer start new vocab words on a non-goal track (studying
  a non-goal deck previously required the chips). Accepted for now — change
  the goal on /settings to shift decks; revisit if cross-track vocab study
  turns out to be a real workflow.
