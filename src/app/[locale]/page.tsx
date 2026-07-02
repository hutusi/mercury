import { ArrowRight, Briefcase, Sparkles, Target } from "lucide-react";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Wordmark } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getDict, localeRedirect } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

export default async function LandingPage() {
  const session = await getSession();
  if (session) return localeRedirect("/dashboard");
  const t = await getDict();

  const features = [
    {
      title: t.landing.featureExamTitle,
      desc: t.landing.featureExamDesc,
      icon: Target,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      title: t.landing.featureBizTitle,
      desc: t.landing.featureBizDesc,
      icon: Briefcase,
      iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      title: t.landing.featureAiTitle,
      desc: t.landing.featureAiDesc,
      icon: Sparkles,
      iconClass: "bg-primary/10 text-primary",
    },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Subtle brand wash behind the hero */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/[0.06] to-transparent"
        aria-hidden
      />

      <header className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <Wordmark />
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative mx-auto flex max-w-5xl flex-col items-center gap-14 px-6 pt-16 pb-24 text-center sm:pt-24">
        <div className="space-y-5">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            {t.landing.heroTitle}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-pretty text-muted-foreground">
            {t.landing.heroSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
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

        <div className="grid w-full gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="text-left">
              <CardContent>
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${f.iconClass}`}
                  aria-hidden
                >
                  <f.icon className="size-5" />
                </div>
                <h2 className="mt-4 font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
