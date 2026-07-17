import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/session";
import { localeRedirect } from "@/lib/i18n";
import { getLearnerProfile } from "@/lib/queries/profile";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) return localeRedirect("/login");

  // Onboarding invariant: a goal track on the learner profile (see requireOnboarded).
  const profile = await getLearnerProfile(session.user.id);
  if (!profile?.goalTrack) return localeRedirect("/onboarding");

  return <AppShell userName={session.user.name || session.user.email}>{children}</AppShell>;
}
