import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/layout/AppShell";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { getDict, localeRedirect } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { DEFAULT_LOCALE, htmlLang, isLocale, LOCALES } from "@/lib/i18n/routing";
import { openGraphFor } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return {
    alternates: {
      canonical: `/${resolved}`,
      languages: Object.fromEntries(LOCALES.map((l) => [htmlLang(l), `/${l}`])),
    },
    // Unlike the auth/app pages, the landing page has a canonical page-specific
    // URL, so it restores the required og:url (absent from the shared layout).
    openGraph: openGraphFor(resolved, `/${resolved}`),
  };
}

export default async function LandingPage() {
  const session = await getSession();
  if (session) return localeRedirect("/dashboard");
  const t = await getDict();

  const features = [
    { title: t.landing.featureAiTitle, desc: t.landing.featureAiDesc },
    { title: t.landing.featureExamTitle, desc: t.landing.featureExamDesc },
    { title: t.landing.featureBizTitle, desc: t.landing.featureBizDesc },
  ];

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Wordmark />
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-14 pb-24 sm:px-10 sm:pt-20">
        {/* The giant dictionary entry is decorative (p); the page's real h1 is
            the hero title below — e2e asserts its heading role and text. */}
        <EntryHeader
          headingLevel="p"
          size="xl"
          title={t.common.appName}
          ipa={t.entry.mercuryIpa}
          pos={t.entry.mercuryPos}
          gloss={t.entry.mercuryGloss}
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end">
          <div className="space-y-5">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-balance sm:text-4xl">
              {t.landing.heroTitle}
            </h1>
            <p className="max-w-2xl text-lg text-pretty text-muted-foreground">
              {t.landing.heroSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button asChild size="lg" className="h-11 px-6 text-base">
              <Link href="/register">
                {t.landing.ctaStart}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-6 text-base">
              <Link href="/login">{t.landing.ctaLogin}</Link>
            </Button>
          </div>
        </div>

        {/* Features as numbered senses of the entry */}
        <div className="mt-20 grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {features.map((f, i) => (
            <div key={f.title} className="py-8 sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <span className="font-mono text-2xs font-medium tracking-label text-cinnabar uppercase">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-3 font-serif text-xl font-medium">{f.title}</h2>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
