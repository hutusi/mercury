# ADR 0003: SM-2 over FSRS for spaced repetition

**Status:** Accepted (2026-07)

## Context

Vocabulary flashcards need a review scheduler. FSRS is the state of the art (better retention per review), but it relies on fitted parameters and a heavier model; SM-2 is deterministic and simple.

## Decision

Classic SM-2 (`src/lib/srs.ts`) with a four-button grade scale mapped to SM-2 quality: Again=1, Hard=3, Good=4, Easy=5. Two pragmatic tweaks: "Hard" grows mature intervals by 1.2× instead of the full ease factor, "Easy" adds a bonus day. Lapses reset repetitions and come back in 10 minutes (re-queued within the session client-side).

## Consequences

- Dependency-free, fully unit-tested (`srs.test.ts` pins the interval table: 1d → 6d → ~15d at EF 2.5).
- At seed-content scale (150 words) FSRS's accuracy edge is immaterial; the `srs_cards` state (ease/interval/repetitions/lapses) migrates to FSRS-shaped state if that ever changes.
