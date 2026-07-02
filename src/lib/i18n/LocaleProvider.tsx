"use client";

import { createContext, useContext } from "react";
import { dictionaries, type Dictionary, type Locale } from "./dictionaries";

const LocaleContext = createContext<{ locale: Locale; dict: Dictionary }>({
  locale: "zh",
  dict: dictionaries.zh,
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, dict: dictionaries[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

/** Typed dictionary for client components: `const t = useT(); t.nav.vocabulary` */
export function useT(): Dictionary {
  return useContext(LocaleContext).dict;
}
