import type { Metadata } from "next";
import { ArrowRight, Check, Flame } from "lucide-react";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/button";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { DEFAULT_LOCALE, htmlLang, isLocale, LOCALES } from "@/lib/i18n/routing";
import { openGraphFor } from "@/lib/seo";
import { cn } from "@/lib/utils";

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

// A build-time guard, not a mode switch: any cookies()/headers() read that
// creeps into this tree (or into the root not-found boundary every route
// includes) fails the build instead of silently making the page dynamic.
export const dynamic = "error";

/**
 * Static: rendered once per locale at build time and served from the edge.
 * Nothing here may read cookies or headers — the dictionary comes from the
 * route param, and the signed-in → /dashboard hop lives in src/proxy.ts.
 */
export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = dictionaries[isLocale(locale) ? locale : DEFAULT_LOCALE];

  const features = [
    { n: "i.", title: t.landing.featureAiTitle, desc: t.landing.featureAiDesc },
    { n: "ii.", title: t.landing.featureExamTitle, desc: t.landing.featureExamDesc },
    { n: "iii.", title: t.landing.featureBizTitle, desc: t.landing.featureBizDesc },
  ];
  // A sample day: what the product is, shown rather than told.
  const preview = [
    { title: t.plan.itemVocabReview, reason: t.landing.previewReason1, minutes: 8, done: true },
    { title: t.plan.itemReading, reason: t.landing.previewReason2, minutes: 12, done: false },
    { title: t.plan.itemWriting, reason: t.landing.previewReason3, minutes: 6, done: false },
    { title: t.plan.itemMistakes, reason: t.landing.previewReason4, minutes: 3, done: false },
  ];
  const currentIndex = preview.findIndex((p) => !p.done);

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-[72.5rem] items-center gap-3 px-4 py-5 sm:px-8 lg:px-12">
        <Wordmark />
        <div className="flex-1" />
        <LanguageToggle />
        <Button asChild variant="ghost">
          <Link href="/login">{t.landing.ctaLogin}</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-[72.5rem] px-4 pt-8 pb-10 sm:px-8 sm:pt-16 lg:px-12 lg:pt-22">
        <div className="flex flex-wrap items-center gap-x-20 gap-y-12">
          <div className="min-w-0 flex-[999_1_27.5rem]">
            <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-muted-foreground">
              <span aria-hidden className="font-serif text-lg italic">
                {t.entry.mercuryIpa}
              </span>
              <span aria-hidden className="font-serif text-xs font-semibold text-brand-ink italic">
                {t.entry.mercuryPos}
              </span>
              <span className="text-[0.9375rem]">{t.landing.eyebrow}</span>
            </p>
            <h1 className="mt-5 font-serif text-[2.5rem] leading-[1.14] font-medium text-balance sm:text-6xl lg:text-[4.25rem]">
              {t.landing.heroTitle}
            </h1>
            <p className="mt-6 max-w-[34em] text-[1.0625rem] leading-[1.75] text-pretty text-soft-3">
              {t.landing.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-13 px-7 text-base">
                <Link href="/register">
                  {t.landing.ctaStart}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-13 px-6 text-base">
                <Link href="/login">{t.landing.ctaLogin}</Link>
              </Button>
            </div>
          </div>

          <figure
            aria-label={t.landing.previewLabel}
            className="w-full max-w-[30rem] min-w-0 flex-[1_1_21.25rem] rounded-2xl border border-border bg-card p-6 shadow-lift"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-serif text-xl font-medium">{t.landing.preview}</span>
              <span className="text-[0.8125rem] text-muted-foreground">
                {t.landing.previewMeta}
              </span>
            </div>
            <div aria-hidden className="mt-4 mb-5 flex h-[0.3125rem] gap-1">
              {preview.map((p, i) => (
                <span
                  key={p.title}
                  className={cn(
                    "rounded-full",
                    p.done ? "bg-brand" : i === currentIndex ? "bg-brand-mid" : "bg-track",
                  )}
                  style={{ flex: p.minutes }}
                />
              ))}
            </div>
            <ol>
              {preview.map((p, i) => (
                <li key={p.title} className="flex gap-3.5">
                  <div aria-hidden className="flex w-6 shrink-0 flex-col items-center">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full border-2 text-[0.6875rem] font-semibold",
                        p.done
                          ? "border-brand bg-brand text-brand-foreground"
                          : i === currentIndex
                            ? "border-brand bg-card text-brand-ink"
                            : "border-input bg-card text-muted-foreground",
                      )}
                    >
                      {p.done ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    {i < preview.length - 1 ? (
                      <span
                        className={cn(
                          "my-1 min-h-3.5 w-0.5 flex-1 rounded-full",
                          p.done ? "bg-brand" : "bg-input",
                        )}
                      />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 items-start gap-2.5 pt-px pb-[1.125rem]">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[0.9375rem] font-medium",
                          p.done && "text-muted-foreground",
                        )}
                      >
                        {p.title}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{p.reason}</p>
                    </div>
                    <span className="text-[0.8125rem] whitespace-nowrap text-muted-foreground tabular-nums">
                      {p.minutes} {t.common.minutes}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <figcaption className="flex items-center gap-2 border-t border-border pt-3.5 text-[0.8125rem] text-muted-foreground">
              <Flame className="size-4 shrink-0 text-coral" aria-hidden />
              {t.landing.streakPill}
            </figcaption>
          </figure>
        </div>

        <div className="mt-16 grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-x-10 border-t border-border sm:mt-24 lg:mt-30">
          {features.map((f) => (
            <div key={f.title} className="pt-7 pb-2">
              <p aria-hidden className="font-serif text-[0.9375rem] text-brand-ink italic">
                {f.n}
              </p>
              <h2 className="mt-3.5 font-serif text-[1.4375rem] leading-snug font-medium">
                {f.title}
              </h2>
              <p className="mt-2.5 text-[0.9375rem] leading-[1.75] text-pretty text-soft-3">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto flex max-w-[72.5rem] flex-wrap gap-x-5 gap-y-2 px-4 pt-6 pb-10 text-[0.8125rem] text-muted-foreground sm:px-8 lg:px-12">
        <span>© 2026 Mercury</span>
        <span>{t.landing.foot}</span>
      </footer>
    </div>
  );
}
