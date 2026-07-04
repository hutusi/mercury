"use client";

import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * Shared body for the route error boundaries: a dictionary-entry heading, a
 * gloss, and two escape hatches — retry the failed segment, or go home. Kept
 * separate from the boundary files so `(app)/error` (inside the shell) and
 * `[locale]/error` (standalone) render identical UI.
 */
export function ErrorState({ reset }: { reset: () => void }) {
  const t = useT();
  return (
    <div className="space-y-6">
      <EntryHeader title={t.errors.boundaryTitle} gloss={t.errors.boundaryBody} />
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>{t.common.tryAgain}</Button>
        <Button asChild variant="outline">
          <Link href="/">{t.errors.goHome}</Link>
        </Button>
      </div>
    </div>
  );
}
