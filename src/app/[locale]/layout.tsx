import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { dictionaries } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { DEFAULT_LOCALE, htmlLang, isLocale, LOCALES } from "@/lib/i18n/routing";
import { openGraphFor } from "@/lib/seo";
import { BRAND_COLORS } from "@/lib/brand-colors";
import { siteUrl } from "@/lib/site-url";
import "../globals.css";

// Latin glyphs only: zh body text renders through the platform CJK faces in
// --font-sans, zh headings through the self-hosted Noto Serif SC slices in
// --font-serif (see globals.css).
const plexSans = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-600.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-plex-sans",
});
// Headings, headwords, and passages; italics carry IPA transcriptions.
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

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Tint mobile browser chrome to match the page background (the --background
// token) in each scheme, so the address bar blends with the paper instead of
// flashing the browser's default. viewportFit: cover lets the phone tab bar
// and toasts pad themselves with env(safe-area-inset-bottom).
export const viewport: Viewport = {
  colorScheme: "light dark",
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_COLORS.paper },
    { media: "(prefers-color-scheme: dark)", color: BRAND_COLORS.paperDark },
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
    // Site-wide OG defaults, no og:url — a layout-level url is inherited by every
    // child (login, app pages), tagging them all as the locale root. The landing
    // page sets its own og:url (openGraphFor(locale, url)); og:image/twitter:image
    // are injected by src/app/[locale]/opengraph-image.tsx.
    openGraph: openGraphFor(resolved),
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
      lang={htmlLang(locale)}
      className={`${plexSans.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LocaleProvider locale={locale} dict={dictionaries[locale]}>
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
