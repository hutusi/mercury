import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dictionaries, LOCALE_COOKIE, type Dictionary, type Locale } from "./dictionaries";
import { localePath } from "./routing";

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

/**
 * redirect() to an internal path under the current request's locale. The proxy
 * keeps the locale cookie synced to the URL segment, so the cookie is the
 * right locale even in contexts without route params (server actions,
 * requireUser).
 */
export async function localeRedirect(href: string): Promise<never> {
  redirect(localePath(await getLocale(), href));
}

export { dictionaries, LOCALE_COOKIE };
export type { Dictionary, Locale };
