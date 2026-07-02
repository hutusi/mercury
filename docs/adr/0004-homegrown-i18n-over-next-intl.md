# ADR 0004: Homegrown i18n over next-intl

**Status:** Accepted (2026-07)

## Context

The UI must ship in Simplified Chinese (default) and English. But the _learning content_ is inherently bilingual inside the data model — every record carries both languages as fields; that is the product. Only UI chrome (~250 strings) needs a translation layer. next-intl would impose `[locale]` route segments, middleware config, and message catalogs for that small surface.

## Decision

A typed dictionary module (`src/lib/i18n/dictionaries.ts`): the `Dictionary` type is derived from the zh dictionary (`DeepString<typeof zh>`), so en cannot drift at compile time; a runtime parity test double-checks. Locale comes from the `mercury_locale` cookie, read **server-side** for the first paint (`getDict()`); client components consume `useT()` from a context provider. No locale URL segments.

## Consequences

- Zero hydration flash: server and client render from the same cookie-derived locale; `navigator.language` is never consulted.
- No pluralization/ICU support — acceptable for chrome strings; revisit if a third locale or complex formatting arrives.
- Both dictionaries ship in the client bundle (small).
