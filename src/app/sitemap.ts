import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/routing";
import { siteUrl } from "@/lib/site-url";

// Only the public landing pages (/zh, /en) belong in the sitemap; every other
// route is auth-gated and blocked in robots. Each entry carries hreflang
// alternates mirroring the landing page's own <link rel="alternate">.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const languages = {
    "zh-CN": new URL("/zh", base).toString(),
    en: new URL("/en", base).toString(),
  };
  return LOCALES.map((locale) => ({
    url: new URL(`/${locale}`, base).toString(),
    changeFrequency: "monthly",
    priority: locale === DEFAULT_LOCALE ? 1 : 0.9,
    alternates: { languages },
  }));
}
