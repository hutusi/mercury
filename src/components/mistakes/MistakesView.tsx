"use client";

import { useState } from "react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Stat } from "@/components/typography/Stat";
import { EmptyState } from "@/components/typography/EmptyState";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { MistakeVM } from "@/lib/mistakes";
import { MistakeItem } from "./MistakeItem";
import { VocabMistakeItem } from "./VocabMistakeItem";

const GROUP_ORDER = ["reading", "listening", "vocab_quiz", "exam"] as const;

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

  const groupLabels: Record<(typeof GROUP_ORDER)[number], string> = {
    reading: t.nav.reading,
    listening: t.nav.listening,
    vocab_quiz: t.vocab.quiz,
    exam: t.nav.exams,
  };

  const items = showCleared ? cleared : active;
  const groups = GROUP_ORDER.map((kind) => ({
    kind,
    label: groupLabels[kind],
    items: items.filter((m) => m.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border py-4">
        <div className="flex gap-10">
          {/* The red pen only while there is something left to clear. */}
          <Stat label={t.mistakes.activeLabel} value={counts.active} accent={counts.active > 0} />
          <Stat label={t.mistakes.clearedLabel} value={counts.cleared} />
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
                  <VocabMistakeItem key={`${m.kind}-${m.wordId}`} mistake={m} />
                ) : (
                  <MistakeItem key={`${m.kind}-${m.refId}-${m.questionId}`} mistake={m} />
                ),
              )}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
