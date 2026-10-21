"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { fill } from "@/lib/i18n/fill";

/**
 * The result at a glance: a dusk-blue ring with the score, what it means,
 * and where the misses went. Takes focus when it appears — the answering
 * view it replaces is gone, so keyboard and screen-reader users land here.
 */
export function ScoreCard({
  score,
  total,
  durationSeconds,
}: {
  score: number;
  total: number;
  durationSeconds?: number;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="rounded-xl border border-border bg-card p-[1.375rem] outline-hidden"
    >
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-[3px] border-brand font-serif text-2xl font-medium tabular-nums">
          {score}/{total}
        </span>
        <div className="min-w-0">
          <p className="text-[0.8125rem] text-muted-foreground">{t.reading.result}</p>
          <p className="mt-0.5 font-serif text-[1.3125rem] leading-snug font-medium">
            {fill(t.reading.scoreLabel, { s: score, n: total })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {t.common.accuracy} {pct}%
            {durationSeconds !== undefined
              ? ` · ${t.common.timeUsed} ${String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:${String(durationSeconds % 60).padStart(2, "0")}`
              : ""}
          </p>
        </div>
      </div>
      <p className="mt-3.5 text-sm leading-[1.7] text-pretty text-soft">
        {score === total ? t.reading.perfect : t.reading.someWrong}
      </p>
    </div>
  );
}
