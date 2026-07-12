"use client";

import { useState, useTransition } from "react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import { setRemindersEnabled } from "@/lib/actions/settings";
import { useT } from "@/lib/i18n/LocaleProvider";

export function ReminderToggle({ enabled }: { enabled: boolean }) {
  const t = useT();
  // Optimistic so the button flips instantly; reverted if the action fails.
  const [optimistic, setOptimistic] = useState(enabled);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      try {
        await setRemindersEnabled(next);
      } catch {
        setOptimistic(!next);
      }
    });
  }

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel as="h2">{t.dashboard.reminderToggleLabel}</SectionLabel>
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          disabled={pending}
          aria-pressed={optimistic}
        >
          {optimistic ? t.dashboard.reminderToggleOn : t.dashboard.reminderToggleOff}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t.dashboard.reminderToggleHint}</p>
    </div>
  );
}
