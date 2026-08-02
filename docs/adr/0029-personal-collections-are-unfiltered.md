# 0029. Personal collections are unfiltered; vocabulary is scenario-first

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

Vocabulary goes one step further: **words are not owned by tracks**. A word
like "broadcast" is an English word that happens to ship in the TOEIC pack;
ADR 0020 already argued the tutor models one learner whose ability is shared
across contexts. The `topic` field on every word is a scenario (meetings,
media, travel…) — a track-free organizing principle that was already in the
content. The track remains as pack provenance, useful only as an invisible
prioritization signal.

## Decision

- **Vocabulary (overview + study) and mistakes render no track filter.** The
  overview counts and word list, the due-card queue, and the notebook always
  cover every track. The web pages ignore `?track=`.
- **The word list is scenario-first.** Words group by `topic` across packs
  with no track labels anywhere; topics containing goal-pack words sort
  first, alphabetical within each tier.
- **New words are goal-first with spillover.** `getStudyQueue` filters its
  two halves independently: due cards unfiltered, and the new-word top-up
  unfiltered but ordered goal pack first (`newPriorityTrack`), spilling over
  to the other packs once the goal pack is exhausted. The goal steers what
  you learn next; it never walls off the rest. This also keeps the
  all-tracks fresh stat truthful — Study can eventually serve every fresh
  word.
- **Headwords are unique across packs.** Same-sense duplicates were
  deduplicated in content (with the mandatory data migration —
  `drizzle/0023` pattern); a content test enforces cross-track uniqueness
  with an explicit allowlist for genuine polysemy (`check-in`, `launch`,
  `backlog`), whose distinct senses live in different scenarios anyway.
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
- Deduplication deletes learner progress on the removed twin (`srs_cards`
  FK-cascade → `review_logs`) and its quiz-mistake rows (explicit deletes —
  they reference word ids as plain text and would otherwise inflate the
  dashboard badge while `/mistakes` silently drops them). The migration also
  clears all quiz sessions: practice sessions carry no word FK, and one
  completed after the migration would re-record mistakes for deleted ids
  (they are 30-minute ephemera; mid-quiz learners restart). Accepted
  pre-launch; the surviving twin keeps its own card.
- Web and API study-queue semantics diverge: the API's `?track=` contract
  (filter both halves, goal default) is unchanged and has no spillover
  parameter until a native client needs one.
