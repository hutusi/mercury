import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TrackSwitcher } from "@/components/layout/TrackSwitcher";
import { getSession } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");

  const settings = await getSettings(session.user.id);
  if (!settings?.activeTrack) redirect("/onboarding");

  return (
    <AppShell
      userName={session.user.name || session.user.email}
      trackSwitcher={<TrackSwitcher current={settings.activeTrack} />}
    >
      {children}
    </AppShell>
  );
}
