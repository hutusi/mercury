import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/lib/brand-colors";
import { dictionaries } from "@/lib/i18n";
import { DEFAULT_LOCALE, htmlLang } from "@/lib/i18n/routing";

// The manifest is a single, non-locale route (/manifest.webmanifest), so it
// carries the default-locale copy. Colours are the paper token; the icon
// (src/app/icon.svg) is a full-bleed dusk-blue station node, so it doubles as
// the maskable icon.
export default function manifest(): MetadataRoute.Manifest {
  const meta = dictionaries[DEFAULT_LOCALE].meta;
  return {
    name: meta.title,
    short_name: "Mercury",
    description: meta.description,
    start_url: "/",
    display: "standalone",
    lang: htmlLang(DEFAULT_LOCALE),
    background_color: BRAND_COLORS.paper,
    theme_color: BRAND_COLORS.paper,
    icons: [
      // The icon is full-bleed, safe under a mask; list both purposes
      // (the manifest type takes one purpose per entry, not a space-separated set).
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
