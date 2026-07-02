import { AppShell } from "@/components/layout/AppShell";
import { TrackSwitcher } from "@/components/layout/TrackSwitcher";
import { getSession } from "@/lib/auth/session";
import { localeRedirect } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) return localeRedirect("/login");

  const settings = await getSettings(session.user.id);
  if (!settings?.activeTrack) return localeRedirect("/onboarding");

  return (
    <AppShell
      userName={session.user.name || session.user.email}
      trackSwitcher={<TrackSwitcher current={settings.activeTrack} />}
    >
      {children}
    </AppShell>
  );
}
