/**
 * Locale primitives with no dictionary attached. Client code imports these
 * (and only these) so neither dictionary is ever bundled into client JS: the
 * active locale's dictionary reaches the browser once, as a prop from the
 * [locale] layout (see LocaleProvider).
 */
export type Locale = "zh" | "en";

export const LOCALE_COOKIE = "mercury_locale";
