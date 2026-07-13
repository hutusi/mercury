/**
 * Pure streak logic, kept free of DB imports so it can be unit-tested under
 * Bun with no database — importing src/lib/db would pull in the pg client.
 */

export const DEFAULT_TIME_ZONE = "Asia/Shanghai";

/** True when Intl recognizes the value as an IANA timezone identifier. */
export function isIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

/** Calendar date as YYYY-MM-DD in the learner's IANA timezone. */
export function calendarDay(date: Date = new Date(), timeZone: string = DEFAULT_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Shift a calendar-day string without involving a local or DST-sensitive clock. */
export function shiftCalendarDay(day: string, amount: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + amount));
  return shifted.toISOString().slice(0, 10);
}

/**
 * Consecutive-day streak counted back from `today`, or from yesterday if the
 * user hasn't studied yet today (so the streak isn't shown broken mid-day).
 * `days` holds YYYY-MM-DD strings.
 */
export function computeStreak(
  days: ReadonlySet<string>,
  today: Date | string = new Date(),
  timeZone: string = DEFAULT_TIME_ZONE,
): number {
  let cursor = typeof today === "string" ? today : calendarDay(today, timeZone);
  if (!days.has(cursor)) {
    cursor = shiftCalendarDay(cursor, -1);
    if (!days.has(cursor)) return 0;
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftCalendarDay(cursor, -1);
  }
  return streak;
}
