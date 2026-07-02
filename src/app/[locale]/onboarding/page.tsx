import { TrackPicker } from "@/components/dashboard/TrackPicker";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { getSession } from "@/lib/auth/session";
import { getDict, localeRedirect } from "@/lib/i18n";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) return localeRedirect("/login");
  const t = await getDict();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-12">
        <SectionLabel as="p" className="mb-4 text-cinnabar">
          {t.common.appName}
        </SectionLabel>
        <EntryHeader
          title={t.onboarding.title}
          ipa={t.entry.onboardingIpa}
          pos={t.entry.onboardingPos}
          gloss={t.onboarding.subtitle}
          className="mb-10"
        />
        <TrackPicker />
      </main>
    </div>
  );
}
