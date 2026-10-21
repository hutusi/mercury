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

/** Offset (ms) of `timeZone` from UTC at a given instant, to the second. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The UTC instant of local midnight starting `day` in `timeZone`. */
function zonedMidnight(day: string, timeZone: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  const wallMidnight = Date.UTC(year, month - 1, date);
  // Two refinements settle the offset even when midnight sits next to a DST
  // transition (the offset at the first guess may be the other side's).
  let instant = wallMidnight;
  for (let i = 0; i < 2; i++) instant = wallMidnight - zoneOffsetMs(instant, timeZone);
  return new Date(instant);
}

/**
 * The learner-local day as a half-open UTC range [start, end): what "today"
 * means for plan completion. DST-safe — a 23- or 25-hour day is just a
 * shorter or longer range.
 */
export function learnerDayRange(
  day: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): { start: Date; end: Date } {
  return {
    start: zonedMidnight(day, timeZone),
    end: zonedMidnight(shiftCalendarDay(day, 1), timeZone),
  };
}

export interface WeekDot {
  day: string;
  active: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** Monday→Sunday of the learner's current week, with each day's activity. */
export function weekDots(days: ReadonlySet<string>, today: string): WeekDot[] {
  const [year, month, date] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay(); // 0 = Sunday
  const monday = shiftCalendarDay(today, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = shiftCalendarDay(monday, i);
    return { day, active: days.has(day), isToday: day === today, isFuture: day > today };
  });
}
