import {
  BookMarked,
  BookOpenText,
  Headphones,
  Mic,
  NotebookPen,
  PenLine,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { getDict } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { PlanItem, PlanItemKind, PlanReasonKey } from "@/lib/plan-core";

const KIND_ICONS: Record<PlanItemKind, LucideIcon> = {
  vocab_review: BookMarked,
  vocab_new: Sparkles,
  mistakes: NotebookPen,
  reading: BookOpenText,
  listening: Headphones,
  writing: PenLine,
  speaking: Mic,
  mock_exam: Timer,
};

/**
 * 今日计划 — the dashboard's lead card. The learner never browses the catalog:
 * the plan engine (src/lib/plan-core.ts) picks the shortest path for today
 * and each row deep-links straight into the work.
 */
export async function TodayPlanCard({ items }: { items: PlanItem[] }) {
  const t = await getDict();
  if (items.length === 0) return null;

  const itemLabels: Record<PlanItemKind, string> = {
    vocab_review: t.plan.itemVocabReview,
    vocab_new: t.plan.itemVocabNew,
    mistakes: t.plan.itemMistakes,
    reading: t.plan.itemReading,
    listening: t.plan.itemListening,
    writing: t.plan.itemWriting,
    speaking: t.plan.itemSpeaking,
    mock_exam: t.plan.itemMockExam,
  };
  const reasonLabels: Record<PlanReasonKey, string> = {
    dueVocab: t.plan.reasonDueVocab,
    newWords: t.plan.reasonNewWords,
    clearMistakes: t.plan.reasonClearMistakes,
    weakSkill: t.plan.reasonWeakSkill,
    writingCadence: t.plan.reasonWritingCadence,
    speakingCadence: t.plan.reasonSpeakingCadence,
    examCheckpoint: t.plan.reasonExamCheckpoint,
  };

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel as="h2">{t.plan.title}</SectionLabel>
        <p className="text-xs text-muted-foreground">{t.plan.subtitle}</p>
      </div>
      <ol className="mt-3 divide-y divide-border border-y border-border">
        {items.map((item, index) => {
          const Icon = KIND_ICONS[item.kind];
          const accent = item.kind === "mock_exam";
          return (
            <li key={`${item.kind}-${item.refId ?? index}`}>
              <Link
                href={item.href}
                className="group flex items-center gap-4 py-3 transition-colors hover:bg-muted/50"
              >
                <span className="w-5 text-right font-mono text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <Icon
                  className={`size-4 ${accent ? "text-cinnabar" : "text-muted-foreground"}`}
                  aria-hidden
                />
                <span className="flex-1 text-sm font-medium group-hover:underline group-hover:underline-offset-4">
                  {itemLabels[item.kind]}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {reasonLabels[item.reasonKey]}
                </span>
                <span className="w-14 text-right font-mono text-xs text-muted-foreground">
                  {item.estMinutes} {t.plan.minutesUnit}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
