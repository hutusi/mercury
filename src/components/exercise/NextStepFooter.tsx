"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * The moment after a score is the highest-motivation moment in the app —
 * route it to an action, not back to a list. Primary: the next unattempted
 * item (when the caller found one). Secondary: review the mistakes this
 * attempt just created. Tertiary: back to the list.
 */
export function NextStepFooter({
  nextHref,
  wrongCount = 0,
  backHref,
  backLabel,
}: {
  nextHref?: string | null;
  wrongCount?: number;
  /** Omit when the page already carries its own back affordance. */
  backHref?: string;
  backLabel?: string;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-4">
      {nextHref && (
        <Button asChild>
          <Link href={nextHref}>
            {t.common.nextExercise}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      )}
      {wrongCount > 0 && (
        <Link
          href="/mistakes"
          className="text-sm font-medium text-cinnabar underline underline-offset-4 transition-colors hover:text-cinnabar/80"
        >
          {t.common.reviewWrongCta} · {wrongCount}
        </Link>
      )}
      {backHref && (
        <Link
          href={backHref}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {backLabel}
        </Link>
      )}
    </div>
  );
}
