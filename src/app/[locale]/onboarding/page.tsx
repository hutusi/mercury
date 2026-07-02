import { TrackPicker } from "@/components/dashboard/TrackPicker";
import { getSession } from "@/lib/auth/session";
import { getDict, localeRedirect } from "@/lib/i18n";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) return localeRedirect("/login");
  const t = await getDict();

  return (
    <div className="relative min-h-screen bg-background">
      {/* Subtle brand wash, matching the landing hero */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-linear-to-b from-primary/[0.06] to-transparent"
        aria-hidden
      />
      <main className="relative mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">
            {t.common.appName}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{t.onboarding.title}</h1>
          <p className="mt-2 text-muted-foreground">{t.onboarding.subtitle}</p>
        </div>
        <TrackPicker />
      </main>
    </div>
  );
}
