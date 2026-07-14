import { ImageResponse } from "next/og";
import { dictionaries } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/routing";

// A single, locale-neutral link-preview card. It lives under [locale] rather
// than at the app root because the locale proxy 307-redirects any dot-less root
// path to /{locale}/… — every other metadata route (robots.txt, sitemap.xml,
// manifest.webmanifest, the icons) carries an extension and is skipped by the
// proxy matcher, but /opengraph-image would not be. The card stays Latin: the
// localized title/description ride the text metadata in the layout, and keeping
// the image English sidesteps embedding a CJK font (satori can't read the
// repo's .woff2 faces). Next.js auto-wires the output as og:image/twitter:image.
export const alt = "Mercury";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pre-render one card per locale (identical content) alongside the pages.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// The Lexicon palette as sRGB (the oklch design tokens, matching src/app/icon.svg).
const PAPER = "#f7f6f1"; // --background (light)
const INK = "#201e18"; // --foreground (light)
const MUTED = "#66635c"; // --muted-foreground (light)
const CINNABAR = "#b6341f"; // --cinnabar
const SEAL_INK = "#fbfaf7"; // --cinnabar-foreground

// Reuse the canonical marketing copy so the card can't drift from the metadata.
const meta = dictionaries.en.meta;
const tagline = meta.title.split("·").pop()?.trim() ?? meta.title;

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: PAPER,
        color: INK,
        padding: 96,
        fontFamily: "serif",
      }}
    >
      {/* Brand lockup — the cinnabar seal + wordmark, mirroring AppShell. */}
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 112,
            height: 112,
            borderRadius: 8,
            background: CINNABAR,
            color: SEAL_INK,
            fontSize: 76,
            fontWeight: 600,
          }}
        >
          M
        </div>
        <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: -1 }}>Mercury</div>
      </div>

      {/* Value proposition — the tagline and the full descriptor. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 940 }}>
        <div style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.1 }}>{tagline}</div>
        <div style={{ fontSize: 30, lineHeight: 1.45, color: MUTED, fontFamily: "sans-serif" }}>
          {meta.description}
        </div>
      </div>
    </div>,
    size,
  );
}
