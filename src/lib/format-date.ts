import type { Locale } from "./i18n/dictionaries";

/**
 * Format an instant in the learner's timezone (`user_settings.time_zone`).
 * Server renders must never fall back to the process TZ (UTC in prod shows
 * an evening Shanghai submission as "tomorrow"), and client renders must
 * produce the same string as SSR or React reports a hydration mismatch at
 * day boundaries.
 */
export function formatLearnerDate(
  date: Date,
  locale: Locale,
  timeZone: string,
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "numeric", day: "numeric" },
): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    ...opts,
    timeZone,
  }).format(date);
}
