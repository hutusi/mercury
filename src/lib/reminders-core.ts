import { shiftCalendarDay } from "./streak-core";

/**
 * Pure study-reminder logic, DB-free like streak-core so it unit-tests under
 * Bun. Drives the dashboard nudge today and is written to be reused verbatim
 * by a future delivery channel (email/push) — the caller supplies the data,
 * this module only decides whether a reminder is warranted.
 */

export interface ReminderInput {
  /** Recent activity days as YYYY-MM-DD strings (today/yesterday suffice). */
  days: ReadonlySet<string>;
  /** SRS cards currently due in the user's active track. */
  dueCount: number;
  /** Learner-local calendar day as YYYY-MM-DD. */
  today: string;
}

export interface ReminderState {
  /** Studied yesterday but not yet today — the streak breaks at midnight. */
  streakAtRisk: boolean;
  dueCount: number;
  /** Whether a reminder is worth surfacing at all. */
  show: boolean;
}

export function reminderState({ days, dueCount, today }: ReminderInput): ReminderState {
  const activeToday = days.has(today);
  const streakAtRisk = !activeToday && days.has(shiftCalendarDay(today, -1));
  // Never nag someone who already studied today; otherwise remind when the
  // streak is on the line or reviews are piling up.
  return { streakAtRisk, dueCount, show: !activeToday && (streakAtRisk || dueCount > 0) };
}
