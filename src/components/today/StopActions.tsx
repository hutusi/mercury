"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setPlanItemSkipped } from "@/lib/actions/plan";
import { useT } from "@/lib/i18n/LocaleProvider";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

/**
 * The current stop's actions: "今天跳过" and the primary "开始 →". Skipping
 * gives immediate feedback (a toast) and refreshes the route in its own,
 * non-gating transition (AGENTS.md: never revalidatePath in actions).
 */
export function StopActions({
  day,
  stopKey,
  stopNumber,
  href,
  startLabel,
}: {
  day: string;
  stopKey: string;
  stopNumber: number;
  href: string;
  startLabel: string;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [skipping, startSkip] = useTransition();
  const [, startRefresh] = useTransition();

  function skip() {
    startSkip(async () => {
      const result = await setPlanItemSkipped({ day, key: stopKey, skipped: true }).catch(
        () => null,
      );
      if (result?.ok) toast.show(fill(t.today.skippedToast, { i: stopNumber }));
      else toast.show(t.common.submitRetry);
      startRefresh(() => router.refresh());
    });
  }

  return (
    <div className="ml-auto flex items-center gap-1">
      <Button variant="ghost" onClick={skip} disabled={skipping} className="px-3.5">
        {t.today.skip}
      </Button>
      <Button asChild className="px-6">
        <Link href={href} data-current-stop>
          {startLabel}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

/** A skipped stop stays tappable: opening it brings it back to the route. */
export function SkippedStopLink({
  day,
  stopKey,
  href,
  className,
  children,
}: {
  day: string;
  stopKey: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        // Fire-and-forget: the navigation must not wait on it, and finishing
        // the stop marks it done regardless (done beats skipped).
        void setPlanItemSkipped({ day, key: stopKey, skipped: false }).catch(() => null);
      }}
    >
      {children}
    </Link>
  );
}

/** Enter starts the current stop, unless focus is on a control. */
export function EnterToStart() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = event.target instanceof HTMLElement ? event.target : null;
      if (el && el.closest("a, button, input, textarea, select, [contenteditable='true']")) return;
      const link = document.querySelector<HTMLAnchorElement>("a[data-current-stop]");
      if (!link) return;
      event.preventDefault();
      link.click();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return null;
}
