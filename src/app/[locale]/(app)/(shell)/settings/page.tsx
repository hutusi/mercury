import { headers } from "next/headers";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { GoalEditor } from "@/components/settings/GoalEditor";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { LinkedAccounts } from "@/components/settings/LinkedAccounts";
import { ReminderToggle } from "@/components/dashboard/ReminderToggle";
import { PremiumCta } from "@/components/premium/PremiumCta";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth/auth";
import { enabledSocialProviders } from "@/lib/auth/social-providers";
import { isEmailEnabled } from "@/lib/email/enabled";
import { getDict } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { resolveTier } from "@/lib/membership-core";
import { getMembershipForUser } from "@/lib/queries/membership";
import { getLearnerProfile } from "@/lib/queries/profile";
import { requireOnboarded } from "@/lib/settings";

export default async function SettingsPage() {
  const { user, goalTrack, remindersEnabled } = await requireOnboarded();
  const t = await getDict();
  // Cached — the guard already fetched this row in the same render.
  const [profile, membership, accounts] = await Promise.all([
    getLearnerProfile(user.id),
    getMembershipForUser(user.id),
    auth.api.listUserAccounts({ headers: await headers() }),
  ]);
  const tier = resolveTier(membership ?? null);
  const hasCredential = accounts.some((a) => a.providerId === "credential");
  const providers = enabledSocialProviders(process.env);
  const emailEnabled = isEmailEnabled(process.env);

  return (
    <div className="max-w-2xl space-y-10">
      <EntryHeader
        title={t.nav.settings}
        ipa={t.entry.settingsIpa}
        pos={t.entry.settingsPos}
        gloss={t.settings.subtitle}
      />

      <section>
        <SectionLabel as="h2" className="mb-4">
          {t.settings.goalSection}
        </SectionLabel>
        <GoalEditor
          initial={{
            goalTrack,
            targetScore: profile?.targetScore ?? null,
            examDate: profile?.examDate ?? null,
            dailyMinutes: profile?.dailyMinutes ?? 20,
          }}
        />
      </section>

      <section>
        <SectionLabel as="h2" className="mb-4">
          {t.settings.prefsSection}
        </SectionLabel>
        <ReminderToggle enabled={remindersEnabled} />
      </section>

      <section>
        <SectionLabel as="h2" className="mb-4">
          {t.settings.membershipSection}
        </SectionLabel>
        {/* Only premium wears a badge — a "free" label would frame the base
            experience as lesser; free users just see what premium adds. */}
        <div className="flex items-center gap-3">
          {tier === "premium" && <Badge variant="accent">{t.settings.membershipPremium}</Badge>}
          <span className="text-sm text-muted-foreground">
            {tier === "premium"
              ? membership?.expiresAt
                ? `${t.settings.membershipExpires} ${membership.expiresAt.toISOString().slice(0, 10)}`
                : t.common.noExpiry
              : t.settings.membershipFreeHint}
          </span>
          <PremiumCta />
        </div>
      </section>

      {(hasCredential || emailEnabled || providers.length > 0) && (
        <section>
          <SectionLabel as="h2" className="mb-4">
            {t.settings.securitySection}
          </SectionLabel>
          <div className="space-y-6">
            {hasCredential ? (
              <ChangePasswordForm />
            ) : emailEnabled ? (
              // OAuth-only account: the password-reset flow doubles as
              // "set a password" (resetPassword creates the credential row).
              <p className="text-sm text-muted-foreground">
                {t.settings.oauthOnlyHint}{" "}
                <Link
                  href="/forgot-password"
                  className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-cinnabar"
                >
                  {t.settings.setPassword}
                </Link>
              </p>
            ) : null}
            {providers.length > 0 && (
              <LinkedAccounts
                accounts={accounts.map((a) => ({
                  providerId: a.providerId,
                  accountId: a.accountId,
                }))}
                providers={providers}
                // Keyless: no send path and no server hook — don't gate.
                emailVerified={!emailEnabled || user.emailVerified}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
