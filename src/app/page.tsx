import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { getSession } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const t = await getDict();

  const features = [
    { title: t.landing.featureExamTitle, desc: t.landing.featureExamDesc, icon: "🎯" },
    { title: t.landing.featureBizTitle, desc: t.landing.featureBizDesc, icon: "💼" },
    { title: t.landing.featureAiTitle, desc: t.landing.featureAiDesc, icon: "✨" },
  ];

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16 text-center">
      <div className="absolute top-6 right-6">
        <LanguageToggle />
      </div>
      <div className="space-y-4">
        <p className="text-sm font-semibold tracking-widest text-brand-600 uppercase">
          {t.common.appName}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          {t.landing.heroTitle}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600">
          {t.landing.heroSubtitle}
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/register"
          className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          {t.landing.ctaStart}
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {t.landing.ctaLogin}
        </Link>
      </div>
      <div className="grid w-full gap-6 sm:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm"
          >
            <div className="text-2xl" aria-hidden>
              {f.icon}
            </div>
            <h2 className="mt-3 font-semibold text-slate-900">{f.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
