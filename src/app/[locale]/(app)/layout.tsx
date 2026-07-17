import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/session";
import { localeRedirect } from "@/lib/i18n";
import { getOnboardedState } from "@/lib/settings";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) return localeRedirect("/login");

  // Same onboarding predicate as requireOnboarded/-Api — one invariant everywhere.
  if (!(await getOnboardedState(session.user.id))) return localeRedirect("/onboarding");

  return <AppShell userName={session.user.name || session.user.email}>{children}</AppShell>;
}
