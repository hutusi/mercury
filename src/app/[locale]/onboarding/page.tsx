import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { Wordmark } from "@/components/layout/Wordmark";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getSession } from "@/lib/auth/session";
import { localeRedirect } from "@/lib/i18n";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) return localeRedirect("/login");

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-[72.5rem] items-center gap-3 px-4 py-5 sm:px-8 lg:px-12">
        <Wordmark />
        <div className="flex-1" />
        <LanguageToggle />
      </header>
      <main id="main-content" className="mx-auto max-w-[40rem] px-4 pt-4 pb-16 sm:px-8 sm:pt-10">
        <OnboardingFlow />
      </main>
    </div>
  );
}
