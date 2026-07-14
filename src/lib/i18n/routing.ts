import type { Locale } from "./dictionaries";

/**
 * URL-locale helpers. Every page lives under /zh or /en; these functions are
 * the single place that knows how the prefix composes with app paths. Pure and
 * client-safe — no next/headers, so both the proxy and client components can
 * import it, and bun test can run it without touching the DB.
 */

export const LOCALES = ["zh", "en"] as const;
export const DEFAULT_LOCALE: Locale = "zh";

export function isLocale(value: string | undefined): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? "");
}

/**
 * The BCP-47 language tag for a locale — used for `<html lang>` and hreflang
 * alternates. Lives here so the zh→zh-CN mapping is defined once instead of
 * copy-pasted across the layout, landing page, sitemap, and manifest.
 */
export function htmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en";
}

/** Prefix an internal href with a locale segment: ("zh", "/") → "/zh". */
export function localePath(locale: Locale, href: string): string {
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** Split "/zh/exams/x" → { locale: "zh", rest: "/exams/x" }; no known prefix → locale null. */
export function splitLocalePath(pathname: string): { locale: Locale | null; rest: string } {
  const [, first, ...rest] = pathname.split("/");
  if (isLocale(first)) {
    return { locale: first, rest: rest.length > 0 ? `/${rest.join("/")}` : "/" };
  }
  return { locale: null, rest: pathname };
}

/** Same path in another locale: ("/zh/dashboard", "en") → "/en/dashboard". */
export function swapLocalePath(pathname: string, next: Locale): string {
  return localePath(next, splitLocalePath(pathname).rest);
}
