import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { AppShell } from "@/components/layout/AppShell";
import { PlanCard, PlanCardSkeleton } from "@/components/plan/PlanCard";
import { SectionErrorBoundary } from "@/components/layout/SectionErrorBoundary";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { isEmailEnabled } from "@/lib/email/enabled";
import { localeRedirect } from "@/lib/i18n";
import { getShellMetas } from "@/lib/queries/shell";
import { getOnboardedState } from "@/lib/settings";

/** Hub pages: the navigation shell around the page. */
export default async function ShellLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Deduped with the (app) gate by React cache() — no second lookup.
  const session = await getSession();
  if (!session) return localeRedirect("/login");

  // Soft verification (ADR 0028): the env gate is mandatory — keyless
  // environments can't send the email, and every keyless e2e user is
  // unverified, so an ungated banner would leak onto every page.
  const showVerifyBanner = isEmailEnabled(process.env) && !session.user.emailVerified;

  // Started, not awaited: the nav's badges stream in under Suspense.
  const metas = getShellMetas(session.user.id);
  // Cached by the (app) gate — no extra query.
  const onboarded = await getOnboardedState(session.user.id);

  return (
    <AppShell
      userName={session.user.name || session.user.email}
      isAdmin={session.user.role === "admin"}
      metas={metas}
      planCard={
        onboarded ? (
          <SectionErrorBoundary quiet>
            <Suspense fallback={<PlanCardSkeleton />}>
              <PlanCard
                userId={session.user.id}
                track={onboarded.goalTrack}
                timeZone={onboarded.settings.timeZone}
              />
            </Suspense>
          </SectionErrorBoundary>
        ) : null
      }
      banner={showVerifyBanner ? <VerifyEmailBanner email={session.user.email} /> : undefined}
    >
      {children}
    </AppShell>
  );
}
