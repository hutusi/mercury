# ADR 0014: Learner-local calendar and atomic onboarding

**Status:** Accepted (2026-07)

## Context

Mercury originally derived `activity_days.day`, reminder state, plan dates, and chat quotas from the server process timezone. Production commonly runs in UTC, so a learner in China could see a new day begin at 08:00. The onboarding write also updated `user_settings` and `learner_profiles` separately; a second-write failure could leave an account marked onboarded without its learner-model substrate. A pre-onboarding reminder PATCH could create the settings row first and make the later track upsert leave `onboarded_at` null.

## Decision

- `user_settings.time_zone` stores an IANA timezone identifier. Existing and missing values default to `Asia/Shanghai`; web onboarding sends the browser-resolved zone and native clients should send the device zone.
- `calendarDay()` uses `Intl.DateTimeFormat(..., {timeZone})`; calendar-day arithmetic operates on `YYYY-MM-DD` values in UTC, avoiding daylight-saving gaps and repeats.
- Activity rows, streaks, reminders, daily-plan identity/cadence, and daily AI quotas all use the same learner-local day. Consumers read server-returned day/quota state instead of independently choosing a timezone.
- Onboarding validates the complete `{track, timeZone, goal?}` input, then upserts settings and the learner profile in one transaction. Conflict updates preserve the first `onboarded_at` with `coalesce`, including rows created by an earlier preference PATCH.
- `PATCH /api/v1/me/settings` can change the timezone for future learner-day calculations. Historical `activity_days` are not rewritten.

## Consequences

- Day changes match the learner's location, including DST transitions, and all daily features share one definition of “today.”
- Traveling learners can update their timezone; an update near midnight can create activity under either adjacent calendar day, but never corrupt historical rows.
- Onboarding cannot leave settings and learner goals half-written. The added settings read on day-sensitive mutations is accepted for correctness; later hot paths may carry the timezone from an already-loaded request context.
