# ADR 0033: Persistent daily route — snapshot the plan, derive its status

**Status:** Accepted (2026-10). Extends [ADR 0012](0012-learner-model-and-ai-memory.md)'s deterministic daily plan.

## Context

The daily plan (今日计划, `src/lib/plan-core.ts`) was recomputed from scratch on every request. That was cheap to reason about but made a plan you can't work through: finishing the planned reading exercise didn't mark it done — the next render simply suggested a _different_ unattempted exercise; clearing the due vocabulary made the item vanish; the list reshuffled under the learner mid-day. There was no notion of "stop 2 of 4", nothing to check off, and no way to say "not today".

The Daybreak redesign ([ADR 0032](0032-daybreak-design-system.md)) is built around exactly that: today drawn as a route of stops — done, current, skipped — with every session showing its position and every result naming the next stop.

## Decision

- **Snapshot per learner-day.** New table `daily_plans (user_id, day)` stores the day's `PlanItem[]`, `daily_minutes`, the learner's `skipped_keys`, a `stale` flag, and a `revision`. The plan is built (with the existing pure engine) at the **first read of the learner-local day** and frozen. Materializing on a GET is deliberate and idempotent: concurrent first reads race on the primary key (`insert … on conflict do nothing`, then read the winner).
- **Status is derived, never stored.** Each stop's state comes from that day's facts, judged in the learner's day window (`learnerDayRange`, DST-safe): due/new vocab by distinct cards reviewed (existing vs. created today) against the item's `target` — the review target counts only due cards learned before today, the same split, so a word learned today and due again after an "Again" counts toward new words, never toward a review target it can't meet; mistakes by today's generation clears against a daily target of 3; reading/listening/writing/speaking/book/exam by an attempt or submission _for that exact refId_ today (free practice elsewhere does not count — "自由练习 · 不计入今日计划"). Only the learner's skips are persisted. Precedence is done > skipped > current/open; "current" is the first stop neither done nor skipped. The rules live in the pure `src/lib/plan-status-core.ts` (unit-tested); `getPlanFacts` runs only the queries a plan's kinds need, in one wave.
- **Goal edits regenerate the tail, not history.** Changing the goal track, daily minutes, exam date, or self-rated level marks recent plans stale in the same transaction; the next read keeps every stop already done, skipped, or begun and refills the rest from the new goal (`mergeRegeneratedItems`, optimistic on `revision`, which every write — a skip, a goal edit, a regeneration — bumps, so a skip or a newer goal landing mid-regeneration is never overwritten; the losing read serves the still-stale row and the next read regenerates). Skill-estimate and memo updates never invalidate the plan, so it doesn't rotate while the learner works.
- **Contract.** `GET /api/v1/plan` keeps `items` with its old meaning (what is still left today) and adds `stops` (every stop with `key`, `status`, `progress`, `started`), `summary`, and `revision`. `POST /api/v1/plan/skips {day, key, skipped}` skips or restores a stop; a `day` that is no longer today is `409 plan_day_changed`.
- **Session context without extra latency.** Session pages ask `getFlowContext` (read-only; never creates a plan) where they sit in the route, in parallel with their own content query.

## Consequences

- The plan is cheaper: the ~12-query fan-out that built it now runs once per learner-day instead of on every dashboard render; subsequent reads are a primary-key lookup plus a handful of indexed fact queries.
- A GET can write (once per day). Recorded here because GETs are otherwise pure reads.
- Day boundaries follow the learner's timezone: work that crosses midnight counts toward the new day only if the new day's snapshot contains that stop; changing timezone starts a new day key.
- Content reseeds keep ids stable by policy (docs/CONTENT.md), so a snapshot's refIds stay valid; a removed item would simply never complete.
