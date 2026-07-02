import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell userName={session.user.name || session.user.email}>
      {children}
    </AppShell>
  );
}
