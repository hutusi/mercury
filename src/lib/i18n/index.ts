import { cookies } from "next/headers";
import { dictionaries, LOCALE_COOKIE, type Dictionary, type Locale } from "./dictionaries";

/**
 * Locale for the current request, from the mercury_locale cookie.
 * Server-side only — the first paint must never depend on
 * navigator.language or the client render would mismatch.
 */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value === "en" ? "en" : "zh";
}

/** Typed dictionary for server components. */
export async function getDict(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}

export { dictionaries, LOCALE_COOKIE };
export type { Dictionary, Locale };
