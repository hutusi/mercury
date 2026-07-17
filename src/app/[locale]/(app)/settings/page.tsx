import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { GoalEditor } from "@/components/settings/GoalEditor";
import { ReminderToggle } from "@/components/dashboard/ReminderToggle";
import { getDict } from "@/lib/i18n";
import { getLearnerProfile } from "@/lib/queries/profile";
import { requireOnboarded } from "@/lib/settings";

export default async function SettingsPage() {
  const { user, goalTrack, remindersEnabled } = await requireOnboarded();
  const t = await getDict();
  // Cached — the guard already fetched this row in the same render.
  const profile = await getLearnerProfile(user.id);

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
    </div>
  );
}
