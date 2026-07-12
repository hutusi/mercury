"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import { setRemindersEnabled } from "@/lib/actions/settings";
import { useT } from "@/lib/i18n/LocaleProvider";

export function ReminderToggle({ enabled }: { enabled: boolean }) {
  const t = useT();
  const router = useRouter();
  // Optimistic so the button flips instantly; reverted if the action fails.
  const [optimistic, setOptimistic] = useState(enabled);
  // The button gates on the action round-trip only; the refresh (to hide the
  // nudge) runs in its own transition so a slow tree apply can't wedge the
  // control (see the note in src/lib/actions/settings.ts).
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  async function toggle() {
    const next = !optimistic;
    setOptimistic(next);
    setPending(true);
    try {
      await setRemindersEnabled(next);
      startTransition(() => router.refresh());
    } catch {
      setOptimistic(!next);
    } finally {
      setPending(false);
    }
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
