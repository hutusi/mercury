import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/session";
import { isEmailEnabled } from "@/lib/email/enabled";
import { localeRedirect } from "@/lib/i18n";

/** Hub pages: the navigation shell around the page. */
export default async function ShellLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Deduped with the (app) gate by React cache() — no second lookup.
  const session = await getSession();
  if (!session) return localeRedirect("/login");

  // Soft verification (ADR 0028): the env gate is mandatory — keyless
  // environments can't send the email, and every keyless e2e user is
  // unverified, so an ungated banner would leak onto every page.
  const showVerifyBanner = isEmailEnabled(process.env) && !session.user.emailVerified;

  return (
    <AppShell
      userName={session.user.name || session.user.email}
      isAdmin={session.user.role === "admin"}
      banner={showVerifyBanner ? <VerifyEmailBanner email={session.user.email} /> : undefined}
    >
      {children}
    </AppShell>
  );
}
