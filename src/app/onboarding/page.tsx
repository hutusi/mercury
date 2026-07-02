import { redirect } from "next/navigation";
import { TrackPicker } from "@/components/dashboard/TrackPicker";
import { getSession } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const t = await getDict();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-12">
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold tracking-widest text-brand-600 uppercase">
          {t.common.appName}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {t.onboarding.title}
        </h1>
        <p className="mt-2 text-slate-500">{t.onboarding.subtitle}</p>
      </div>
      <TrackPicker />
    </main>
  );
}
