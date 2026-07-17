# 0020. The track is a goal plus a content filter, not an app mode

Date: 2026-07-17

## Status

Accepted

## Context

Since onboarding first shipped, TOEIC / IELTS / Business English was an app
mode: `user_settings.active_track` selected the whole experience, a header
`TrackSwitcher` swapped it, and `requireTrack()` / `requireTrackApi()` threaded
one track into every feature page and every `/api/v1` route. Switching tracks
replaced the dashboard wholesale.

The data model never agreed with that framing. Streaks, the chat thread, SRS
cards and review logs, and the learner model's `skillEstimates`/`coachMemo`
were already global per user; content and progress rows carry their own
`track` column; detail routes resolve by id with no track at all. The mode
also duplicated state — `active_track` versus `learner_profiles.goalTrack`
("may lag activeTrack after a switch") — and contradicted the AI-私教
positioning: a tutor models one learner whose English ability is shared across
contexts. An exam is a goal, not a workspace.

## Decision

- **`learner_profiles.goalTrack` is the only track state.**
  `user_settings.active_track` is dropped (migration 0016 backfills lagging or
  missing profiles first). The goal is set at onboarding and editable on
  `/settings`; it can change but never clear — **its presence is the
  onboarding invariant** that `requireOnboarded()` / `requireOnboardedApi()`
  and the `(app)` layout gate on (403 `onboarding_required` in the API).
- **One dashboard for everyone.** Stats count across all tracks (the due-words
  and mistakes cards link to `?track=all` so numbers match the lists behind
  them); the deterministic daily plan is aimed at the goal track; tutor
  context and cross-promotion key off the goal.
- **Track is a per-feature content filter.** List surfaces (web and API) take
  `?track=`: absent defaults to the goal track, `all` lifts the filter, exams
  use `toeic|ielts|all` with `all` as the business-goal default (preserving
  the reverse-funnel benchmark hook). Queries take `track: Track | null`
  (null = unfiltered).
- **Vocab quiz stays single-track.** Session rows and mistake identity
  (`quiz-${track}` refIds) bake the track in; the quiz filter offers concrete
  tracks only and `all` resolves to the goal.

## Consequences

- Breaking v1 payload changes (no shipped native client): `Settings` loses
  `activeTrack` (read `goalTrack` from `/me/profile`), `GET /dashboard`
  returns `goalTrack`, and `PATCH /me/profile` rejects `goalTrack: null`.
- With the old `goalTrack === activeTrack` gate gone, learner context embeds
  the goal target in every grading and chat prompt — including submissions on
  other tracks' content. Accepted: the target is durable context about the
  learner, not about the prompt being graded.
- The daily plan is always goal-directed; there is no cross-track merged plan.
  Practicing other tracks happens through the filters, not through the plan.
- Users who cleared `goalTrack` via PATCH before this change (never possible
  through the UI) would bounce to onboarding; the migration backfill covers
  everyone who ever onboarded.
