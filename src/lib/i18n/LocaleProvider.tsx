"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "./dictionaries";
import type { Locale } from "./locale";

const LocaleContext = createContext<{ locale: Locale; dict: Dictionary } | null>(null);

/**
 * The [locale] layout hands the ACTIVE dictionary down as a prop. Importing
 * `dictionaries` here instead bundled both locales (~45 KB of source) into
 * every page's client JS; as a prop, only the active one ships, once, in the
 * layout payload (soft navigations don't re-send the root layout).
 */
export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={{ locale, dict }}>{children}</LocaleContext.Provider>;
}

function useLocaleContext() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useT/useLocale must be used inside <LocaleProvider>");
  return value;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}

/** Typed dictionary for client components: `const t = useT(); t.nav.vocabulary` */
export function useT(): Dictionary {
  return useLocaleContext().dict;
}
