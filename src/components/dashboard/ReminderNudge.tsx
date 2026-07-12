import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { getDict } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { ReminderState } from "@/lib/reminders-core";

/**
 * Study nudge above the fold: a streak about to break gets the cinnabar
 * accent, piled-up reviews the quiet paper fill. Rendered only when the user
 * hasn't studied today (see reminders-core) and reminders are enabled.
 */
export async function ReminderNudge({ reminder }: { reminder: ReminderState }) {
  if (!reminder.show) return null;
  const t = await getDict();

  return (
    <Callout variant={reminder.streakAtRisk ? "accent" : "muted"} className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <BellRing className="size-4 shrink-0 text-cinnabar" aria-hidden />
            {reminder.streakAtRisk ? t.dashboard.reminderStreakTitle : t.dashboard.reminderDueTitle}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {reminder.streakAtRisk && t.dashboard.reminderStreakBody}
            {reminder.dueCount > 0 && (
              <>
                {" "}
                {t.dashboard.reminderDueBefore}{" "}
                <span className="font-mono text-foreground">{reminder.dueCount}</span>{" "}
                {t.dashboard.reminderDueAfter}
              </>
            )}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/vocabulary/study">{t.dashboard.reminderCta}</Link>
        </Button>
      </div>
    </Callout>
  );
}
