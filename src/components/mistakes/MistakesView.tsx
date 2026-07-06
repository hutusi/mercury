"use client";

import { useState } from "react";
import { EmptyState } from "@/components/typography/EmptyState";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Stat } from "@/components/typography/Stat";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { MistakeVM } from "@/lib/mistakes";
import { MistakeItem } from "./MistakeItem";
import { VocabMistakeItem } from "./VocabMistakeItem";

const GROUP_ORDER = ["reading", "listening", "vocab_quiz", "exam"] as const;

function vmKey(m: MistakeVM): string {
  return m.kind === "vocab_quiz" ? `${m.kind}-${m.wordId}` : `${m.kind}-${m.refId}-${m.questionId}`;
}

export function MistakesView({
  active,
  cleared,
  counts,
}: {
  active: MistakeVM[];
  cleared: MistakeVM[];
  counts: { active: number; cleared: number };
}) {
  const t = useT();
  const [showCleared, setShowCleared] = useState(false);
  // Items cleared in this session stay in place (showing their graded state)
  // but count as cleared and appear in the cleared view — no full refresh, so
  // the just-answered feedback survives.
  const [locallyCleared, setLocallyCleared] = useState<ReadonlySet<string>>(new Set());

  const markCleared = (key: string) => setLocallyCleared((prev) => new Set(prev).add(key));

  const groupLabels: Record<(typeof GROUP_ORDER)[number], string> = {
    reading: t.nav.reading,
    listening: t.nav.listening,
    vocab_quiz: t.vocab.quiz,
    exam: t.nav.exams,
  };

  const clearedView: MistakeVM[] = [
    ...active.filter((m) => locallyCleared.has(vmKey(m))).map((m) => ({ ...m, cleared: true })),
    ...cleared,
  ];
  const items = showCleared ? clearedView : active;
  const groups = GROUP_ORDER.map((kind) => ({
    kind,
    label: groupLabels[kind],
    items: items.filter((m) => m.kind === kind),
  })).filter((g) => g.items.length > 0);

  const activeCount = counts.active - locallyCleared.size;
  const clearedCount = counts.cleared + locallyCleared.size;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border py-4">
        <div className="flex gap-10">
          {/* The red pen only while there is something left to clear. */}
          <Stat label={t.mistakes.activeLabel} value={activeCount} accent={activeCount > 0} />
          <Stat label={t.mistakes.clearedLabel} value={clearedCount} />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCleared((s) => !s)}>
          {showCleared ? t.mistakes.showActive : t.mistakes.showCleared}
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState>{showCleared ? t.mistakes.emptyCleared : t.mistakes.empty}</EmptyState>
      ) : (
        groups.map((group) => (
          <section key={group.kind}>
            <SectionLabel as="h2">{group.label}</SectionLabel>
            <ul className="mt-3">
              {group.items.map((m) =>
                m.kind === "vocab_quiz" ? (
                  <VocabMistakeItem
                    key={vmKey(m)}
                    mistake={m}
                    onCleared={() => markCleared(vmKey(m))}
                  />
                ) : (
                  <MistakeItem key={vmKey(m)} mistake={m} onCleared={() => markCleared(vmKey(m))} />
                ),
              )}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
