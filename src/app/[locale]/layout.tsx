import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { dictionaries } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/lib/i18n/routing";
import { siteUrl } from "@/lib/site-url";
import "../globals.css";

// Latin glyphs only — zh renders through the CJK system faces in --font-sans /
// --font-serif (see globals.css).
const inter = localFont({
  src: "../fonts/inter-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-inter",
});
// Display serif for headwords; italics carry IPA transcriptions.
const newsreader = localFont({
  src: [
    {
      path: "../fonts/newsreader-latin-variable-normal.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "../fonts/newsreader-latin-variable-italic.woff2",
      weight: "200 800",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-newsreader",
});
// Data face: timers, scores, counts, micro-labels.
const plexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono-latin-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-mono-latin-600.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-plex-mono",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Tint mobile browser chrome to match the page background (the --background
// token) in each scheme, so the address bar blends with paper / near-black
// instead of flashing the browser's default.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#191712" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const t = dictionaries[resolved];
  // No alternates here: a layout-level canonical would claim every page under
  // [locale] is a duplicate of the locale root. Pages set their own (see the
  // landing page); the app pages are auth-gated and not indexable anyway.
  return {
    metadataBase: siteUrl(),
    title: t.meta.title,
    description: t.meta.description,
    // og:image / twitter:image are injected by src/app/opengraph-image.tsx —
    // don't set openGraph.images here or it overrides that file convention.
    // No og:url: a layout-level url is inherited by every child (login, app
    // pages), tagging them all as the locale root. The landing page carries the
    // canonical signal via alternates.canonical instead.
    openGraph: {
      type: "website",
      siteName: "Mercury",
      title: t.meta.title,
      description: t.meta.description,
      locale: resolved === "zh" ? "zh_CN" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t.meta.title,
      description: t.meta.description,
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  // Unknown prefixes are normally redirected away by the proxy; this guard
  // covers anything that slips past it.
  if (!isLocale(locale)) notFound();

  return (
    // suppressHydrationWarning: next-themes sets the theme class on <html>
    // before hydration.
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      className={`${inter.variable} ${newsreader.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LocaleProvider locale={locale}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
