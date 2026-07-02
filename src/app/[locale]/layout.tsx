import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { dictionaries } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/lib/i18n/routing";
import "../globals.css";

// Latin glyphs only — zh renders through the CJK system faces in --font-sans.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = dictionaries[isLocale(locale) ? locale : DEFAULT_LOCALE];
  // No alternates here: a layout-level canonical would claim every page under
  // [locale] is a duplicate of the locale root. Pages set their own (see the
  // landing page); the app pages are auth-gated and not indexable anyway.
  return {
    metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
    title: t.meta.title,
    description: t.meta.description,
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
      className={inter.variable}
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
