"use client";

import { ArrowRight, Check, Target } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/typography/EmptyState";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatLearnerDate } from "@/lib/format-date";
import { fill } from "@/lib/i18n/fill";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { MistakeVM } from "@/lib/mistakes";
import { calendarDay } from "@/lib/streak-core";
import { cn } from "@/lib/utils";
import { MistakeItem } from "./MistakeItem";
import type { CardMeta } from "./RetestParts";
import { VocabMistakeItem } from "./VocabMistakeItem";

/** Missed this recently counts as "just now". */
const FRESH_MS = 15 * 60 * 1000;

/** Today's mistakes stop, when the plan has one. */
export interface MistakesGoal {
  /** 1-based stop number. */
  index: number;
  target: number;
  /** Cleared today before this page rendered. */
  done: number;
  next: { href: string; label: string };
}

function vmKey(m: MistakeVM): string {
  return m.kind === "vocab_quiz" ? `${m.kind}-${m.wordId}` : `${m.kind}-${m.refId}-${m.questionId}`;
}

export function MistakesView({
  active,
  cleared,
  counts,
  timeZone,
  now,
  goal,
}: {
  active: MistakeVM[];
  cleared: MistakeVM[];
  counts: { active: number; cleared: number };
  timeZone: string;
  /** The server's clock at render: "today" and "just now" match on hydration. */
  now: number;
  goal: MistakesGoal | null;
}) {
  const t = useT();
  const locale = useLocale();
  const [tab, setTab] = useState<"active" | "cleared">("active");
  // Cleared this visit: counted at once, but the card stays (showing its
  // answer and explanation) until "continue" dismisses it to the cleared list.
  const [clearedNow, setClearedNow] = useState<ReadonlySet<string>>(new Set());
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const add = (set: ReadonlySet<string>, key: string) => new Set(set).add(key);
  const today = calendarDay(new Date(now), timeZone);

  const sourceLabel = (m: MistakeVM) => {
    if (m.kind === "vocab_quiz") return t.vocab.quiz;
    const kindLabel = {
      reading: t.nav.reading,
      listening: t.nav.listening,
      exam: t.nav.exams,
      book_quiz: t.nav.books,
    }[m.kind];
    return `${kindLabel} · ${m.sourceTitleZh}`;
  };
  const whenLabel = (m: MistakeVM) => {
    const at = new Date(m.lastWrongAt);
    return calendarDay(at, timeZone) === today
      ? t.mistakes.today
      : formatLearnerDate(at, locale, timeZone, { month: "short", day: "numeric" });
  };
  const metaFor = (m: MistakeVM): CardMeta => ({
    source: sourceLabel(m),
    fresh: now - new Date(m.lastWrongAt).getTime() < FRESH_MS,
    times: fill(t.mistakes.times, { n: m.wrongCount }),
  });

  const activeList = active.filter((m) => !dismissed.has(vmKey(m)));
  const clearedList = [...active.filter((m) => clearedNow.has(vmKey(m))).reverse(), ...cleared];
  const activeCount = counts.active - clearedNow.size;
  const clearedCount = counts.cleared + clearedNow.size;

  return (
    <div className="flex flex-col gap-5">
      {goal ? <GoalStrip goal={goal} clearedNow={clearedNow.size} /> : null}

      <SegmentedControl
        label={t.mistakes.tabsLabel}
        className="self-start"
        value={tab}
        onChange={setTab}
        options={[
          {
            value: "active",
            label: (
              <>
                {t.mistakes.activeLabel}
                <span className={activeCount > 0 ? "text-coral-ink" : undefined}>
                  {activeCount}
                </span>
              </>
            ),
          },
          {
            value: "cleared",
            label: (
              <>
                {t.mistakes.clearedLabel}
                <span className="text-muted-foreground">{clearedCount}</span>
              </>
            ),
          },
        ]}
      />

      {tab === "active" ? (
        activeList.length === 0 ? (
          <EmptyState>{t.mistakes.empty}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {activeList.map((m) => {
              const key = vmKey(m);
              const handlers = {
                meta: metaFor(m),
                onCleared: () => setClearedNow((s) => add(s, key)),
                onDismiss: () => setDismissed((s) => add(s, key)),
              };
              return m.kind === "vocab_quiz" ? (
                <VocabMistakeItem key={key} mistake={m} {...handlers} />
              ) : (
                <MistakeItem key={key} mistake={m} {...handlers} />
              );
            })}
          </ul>
        )
      ) : clearedList.length === 0 ? (
        <EmptyState>{t.mistakes.emptyCleared}</EmptyState>
      ) : (
        <ul className="border-t border-border">
          {clearedList.map((m) => (
            <li
              key={vmKey(m)}
              data-mistake-cleared
              className="flex items-center gap-3.5 border-b border-border px-1 py-3.5"
            >
              <Check className="size-[1.125rem] shrink-0 text-brand" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] leading-normal">
                  {m.kind === "vocab_quiz" ? (
                    <>
                      <span className="font-medium">{m.headword}</span>
                      <span className="ml-2 text-muted-foreground">{m.translationZh}</span>
                    </>
                  ) : (
                    m.question.stem
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{sourceLabel(m)}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{whenLabel(m)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * "第 3 站：清除 3 题 · 已清除 1 / 3" — the notebook as a stop on today's
 * route. Counts this visit's clears live; once the target is met it turns
 * dusk blue and points at the next stop.
 */
function GoalStrip({ goal, clearedNow }: { goal: MistakesGoal; clearedNow: number }) {
  const t = useT();
  const done = Math.min(goal.target, goal.done + clearedNow);
  const complete = done >= goal.target;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-lg px-[1.125rem] py-3.5",
        complete ? "bg-brand-soft text-brand-ink" : "bg-muted text-foreground",
      )}
    >
      <Target className="size-[1.125rem] shrink-0" aria-hidden />
      <p role="status" className="min-w-0 flex-[1_1_12.5rem] text-sm font-medium">
        {complete
          ? fill(t.mistakes.goalDone, { i: goal.index })
          : fill(t.mistakes.goal, { i: goal.index, n: goal.target, d: done })}
      </p>
      <div aria-hidden className="flex gap-1">
        {Array.from({ length: goal.target }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-[1.375rem] rounded-full transition-colors duration-300",
              i < done ? "bg-brand" : "bg-input",
            )}
          />
        ))}
      </div>
      {complete ? (
        <Button asChild size="sm">
          <Link href={goal.next.href}>
            {goal.next.label}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
