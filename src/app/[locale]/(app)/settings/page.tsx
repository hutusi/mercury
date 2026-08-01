import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { GoalEditor } from "@/components/settings/GoalEditor";
import { ReminderToggle } from "@/components/dashboard/ReminderToggle";
import { Badge } from "@/components/ui/badge";
import { getDict } from "@/lib/i18n";
import { resolveTier } from "@/lib/membership-core";
import { getMembershipForUser } from "@/lib/queries/membership";
import { getLearnerProfile } from "@/lib/queries/profile";
import { requireOnboarded } from "@/lib/settings";

export default async function SettingsPage() {
  const { user, goalTrack, remindersEnabled } = await requireOnboarded();
  const t = await getDict();
  // Cached — the guard already fetched this row in the same render.
  const [profile, membership] = await Promise.all([
    getLearnerProfile(user.id),
    getMembershipForUser(user.id),
  ]);
  const tier = resolveTier(membership ?? null);

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
        <div className="flex items-center gap-3">
          <Badge variant={tier === "premium" ? "accent" : "outline"}>
            {tier === "premium" ? t.settings.membershipPremium : t.settings.membershipFree}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {tier === "premium"
              ? membership?.expiresAt
                ? `${t.settings.membershipExpires} ${membership.expiresAt.toISOString().slice(0, 10)}`
                : t.settings.membershipNoExpiry
              : t.settings.membershipFreeHint}
          </span>
        </div>
      </section>
    </div>
  );
}
