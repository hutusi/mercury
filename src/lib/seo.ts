import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/dictionaries";
import { dictionaries } from "@/lib/i18n";

// The Open Graph `locale` tag (underscored region form) — distinct from the
// hreflang/html-lang tag. A Record so adding a Locale forces a matching entry.
const OG_LOCALE: Record<Locale, string> = { zh: "zh_CN", en: "en_US" };

/**
 * The site-wide Open Graph object for a locale, shared by the root layout and
 * the landing page so the card copy is defined once. Pass `url` only on a page
 * with a canonical page-specific URL (the landing page) — omit it in the root
 * layout, or every descendant inherits a URL claiming to be the locale root.
 * og:image is injected separately by src/app/[locale]/opengraph-image.tsx.
 */
export function openGraphFor(locale: Locale, url?: string): NonNullable<Metadata["openGraph"]> {
  const meta = dictionaries[locale].meta;
  return {
    type: "website",
    siteName: "Mercury",
    title: meta.title,
    description: meta.description,
    locale: OG_LOCALE[locale],
    ...(url ? { url } : {}),
  };
}
