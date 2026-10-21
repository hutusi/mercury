import { ToastProvider } from "@/components/ui/toast";
import { getSession } from "@/lib/auth/session";
import { DraftOwnerProvider } from "@/lib/draft-owner";
import { localeRedirect } from "@/lib/i18n";
import { getOnboardedState } from "@/lib/settings";

/**
 * The authoritative gate for every authenticated route (auth layer 2):
 * session, then onboarding. Deliberately chrome-free — the (shell) group
 * renders the navigation shell, the (flow) group the nav-free session frame,
 * so a learning session can drop all navigation without a second gate.
 */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) return localeRedirect("/login");

  // Same onboarding predicate as requireOnboarded/-Api — one invariant everywhere.
  if (!(await getOnboardedState(session.user.id))) return localeRedirect("/onboarding");

  // Both providers sit above the two groups: drafts are keyed to this
  // account (see drafts.ts) without a user id prop on every runner, and a
  // toast raised just before a shell ↔ flow navigation survives it.
  return (
    <DraftOwnerProvider owner={session.user.id}>
      <ToastProvider>{children}</ToastProvider>
    </DraftOwnerProvider>
  );
}
