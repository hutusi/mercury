import { ImageResponse } from "next/og";
import { BRAND_COLORS } from "@/lib/brand-colors";
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

// Reuse the canonical marketing copy so the card can't drift from the metadata.
const meta = dictionaries.en.meta;
const tagline = meta.title.split("·").pop()?.trim() ?? meta.title;

export default function OpengraphImage() {
  const { paper, surface, ink, inkMuted, brand } = BRAND_COLORS;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: paper,
        color: ink,
        padding: 96,
        fontFamily: "serif",
      }}
    >
      {/* Brand lockup — the station node + wordmark, mirroring the app header. */}
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 48,
            border: `6px solid ${brand}`,
            background: surface,
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 18, background: brand }} />
        </div>
        <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: -1 }}>Mercury</div>
      </div>

      {/* Value proposition — the tagline and the full descriptor. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 960 }}>
        <div style={{ fontSize: 64, fontWeight: 500, lineHeight: 1.12 }}>{tagline}</div>
        <div style={{ fontSize: 30, lineHeight: 1.5, color: inkMuted, fontFamily: "sans-serif" }}>
          {meta.description}
        </div>
      </div>
    </div>,
    size,
  );
}
