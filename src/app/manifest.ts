import type { MetadataRoute } from "next";
import { dictionaries } from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/i18n/routing";

// The manifest is a single, non-locale route (/manifest.webmanifest), so it
// carries the default-locale copy. Colours are the --background token; the seal
// (src/app/icon.svg) is full-bleed cinnabar, so it doubles as the maskable icon.
export default function manifest(): MetadataRoute.Manifest {
  const meta = dictionaries[DEFAULT_LOCALE].meta;
  return {
    name: meta.title,
    short_name: "Mercury",
    description: meta.description,
    start_url: "/",
    display: "standalone",
    lang: "zh-CN",
    background_color: "#f7f6f1",
    theme_color: "#f7f6f1",
    icons: [
      // The seal is full-bleed cinnabar, safe under a mask; list both purposes
      // (the manifest type takes one purpose per entry, not a space-separated set).
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
