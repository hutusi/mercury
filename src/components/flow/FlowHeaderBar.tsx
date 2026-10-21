"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SegmentedProgress, type SegmentTone } from "@/components/ui/segmented-progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useFlowState } from "@/lib/flow-store";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/routing";

/**
 * The session top bar: exit on the left, "today's plan · stop 2 of 4" over
 * the route on top of the page, the runner's own counter on the right. Exit
 * honours the runner's policy — "saved" leaves and says so, "confirm" asks
 * first (speaking would lose its recording; an exam keeps ticking).
 */
export function FlowHeaderBar({
  label,
  segments,
  exitHref,
  confirmMessage,
}: {
  label: string;
  segments: { weight: number; tone: SegmentTone }[] | null;
  exitHref: string;
  /** Shown when the runner's exit policy is "confirm". */
  confirmMessage?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const { counter, exit, dirty } = useFlowState();
  const [confirming, setConfirming] = useState(false);

  function leave() {
    if (exit === "saved" && dirty) toast.show(t.flow.saved);
    router.push(localePath(locale, exitHref));
  }

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="mx-auto flex h-[3.875rem] max-w-[72.5rem] items-center gap-3 px-2.5 sm:px-8">
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-2 pr-3 pl-2"
          aria-label={t.flow.exit}
          aria-expanded={exit === "confirm" ? confirming : undefined}
          onClick={() => (exit === "confirm" ? setConfirming((c) => !c) : leave())}
        >
          <X className="size-5" aria-hidden />
          <span className="hidden sm:inline">{t.flow.exit}</span>
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-[0.4375rem]">
          <p className="max-w-full truncate text-[0.8125rem] text-muted-foreground">{label}</p>
          {segments ? (
            <SegmentedProgress segments={segments} className="h-1 w-[min(100%,16.25rem)]" />
          ) : null}
        </div>
        <p
          aria-live="off"
          className="min-w-14 shrink-0 text-right text-sm font-medium tabular-nums"
        >
          {counter}
        </p>
      </div>
      {confirming && exit === "confirm" ? (
        <div
          role="alertdialog"
          aria-label={t.flow.confirmTitle}
          className="border-t border-border bg-card"
        >
          <div className="mx-auto flex max-w-[72.5rem] flex-wrap items-center gap-3 px-4 py-3 sm:px-8">
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">{t.flow.confirmTitle}</span>{" "}
              <span className="text-muted-foreground">{confirmMessage}</span>
            </p>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
              {t.flow.keepGoing}
            </Button>
            <Button size="sm" onClick={leave}>
              {t.flow.exitAnyway}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
