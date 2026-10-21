"use client";

import { ArrowRight, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SanitizedQuestion } from "@/content/types";
import { useT } from "@/lib/i18n/LocaleProvider";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { cn } from "@/lib/utils";
import { QuestionsForm } from "./QuestionsForm";
import { ScoreCard } from "./ScoreCard";
import type { useExerciseAttempt } from "./useExerciseAttempt";

export type ExerciseTab = "material" | "questions";

/**
 * The exercise layout: material (passage, player) beside the questions on
 * wide screens — the questions sticky while answering — and Material /
 * Questions tabs on phones, where side by side doesn't fit.
 */
export function ExerciseSplit({
  tab,
  onTab,
  materialLabel,
  questionsLabel,
  material,
  panel,
  sticky,
}: {
  tab: ExerciseTab;
  onTab: (tab: ExerciseTab) => void;
  materialLabel: string;
  questionsLabel: string;
  material: React.ReactNode;
  panel: React.ReactNode;
  /** Pin the question panel while the material scrolls (answering only). */
  sticky: boolean;
}) {
  return (
    <>
      <div className="sticky top-(--chrome-top) z-10 -mx-4 -mt-6 mb-6 border-b border-border bg-background px-4 py-2.5 sm:-mx-8 sm:-mt-10 sm:px-8 md:hidden">
        <SegmentedControl
          label={`${materialLabel} / ${questionsLabel}`}
          fill
          value={tab}
          onChange={onTab}
          options={[
            { value: "material", label: materialLabel },
            { value: "questions", label: questionsLabel },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-start gap-x-16 gap-y-10">
        <div
          className={cn(
            "min-w-0 flex-[999_1_26rem] lg:max-w-[42.5rem]",
            tab !== "material" && "max-md:hidden",
          )}
        >
          {material}
        </div>
        <div
          className={cn(
            "flex min-w-0 flex-[1_1_21rem] flex-col gap-3.5",
            sticky &&
              "lg:sticky lg:top-[calc(var(--chrome-top)+1.5rem)] lg:-mx-1 lg:max-h-[calc(100dvh-var(--chrome-top)-3rem)] lg:self-start lg:overflow-y-auto lg:px-1 lg:pb-1",
            tab !== "questions" && "max-md:hidden",
          )}
        >
          {panel}
        </div>
      </div>
    </>
  );
}

/**
 * The question column of a reading/listening exercise: the questions and the
 * submit bar while answering; after grading, the score, every answer
 * explained in place, and where to go next.
 */
export function ExercisePanel({
  headingId,
  heading,
  questions,
  attempt,
  submitLabel,
  nextStop,
  nextHref,
  backHref,
  backLabel,
  after,
}: {
  headingId: string;
  heading: string;
  questions: SanitizedQuestion[];
  attempt: ReturnType<typeof useExerciseAttempt>;
  submitLabel: string;
  nextStop?: React.ReactNode;
  nextHref?: string | null;
  backHref: string;
  backLabel: string;
  /** Rendered under the result actions (the cross-promo card). */
  after?: React.ReactNode;
}) {
  const { result } = attempt;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3.5">
      {result ? (
        <ScoreCard
          score={result.score}
          total={result.total}
          durationSeconds={attempt.usedSeconds ?? undefined}
        />
      ) : null}
      <h2 id={headingId} className="mt-1 text-[0.9375rem] font-semibold">
        {heading}
      </h2>
      <QuestionsForm
        questions={questions}
        answers={attempt.answers}
        onAnswer={attempt.answer}
        // Locked while the submit is in flight: a changed pick mid-request
        // would mint a new idempotency key and could record a second attempt.
        disabled={attempt.pending}
        graded={result?.perQuestion}
      />
      {attempt.error ? (
        <Callout variant="error" className="p-3 text-center text-sm">
          {attempt.error}
        </Callout>
      ) : null}
      {result ? (
        <>
          <ResultActions
            nextStop={nextStop}
            nextHref={nextHref}
            wrongCount={attempt.wrongCount}
            onRetry={attempt.retry}
            backHref={backHref}
            backLabel={backLabel}
          />
          {after}
        </>
      ) : (
        <SubmitBar
          answered={attempt.answeredCount}
          total={questions.length}
          pending={attempt.pending}
          onSubmit={attempt.submit}
          label={submitLabel}
        />
      )}
    </section>
  );
}

/** "已答 2 / 3" beside the submit pill; submit unlocks when all are answered. */
export function SubmitBar({
  answered,
  total,
  pending,
  onSubmit,
  label,
}: {
  answered: number;
  total: number;
  pending: boolean;
  onSubmit: () => void;
  label: string;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-card py-2 pr-2 pl-[1.125rem]">
      <span className="flex-1 text-sm text-muted-foreground tabular-nums">
        {fill(t.reading.answered, { a: answered, n: total })}
      </span>
      <Button onClick={onSubmit} disabled={pending || answered < total}>
        {pending ? t.common.loading : `${label} (${answered}/${total})`}
      </Button>
    </div>
  );
}

/**
 * After a score, route to an action: the next stop (in plan mode) or the
 * next unattempted item, then reviewing this attempt's misses, a retry, and
 * the way back.
 */
export function ResultActions({
  nextStop,
  nextHref,
  wrongCount,
  onRetry,
  backHref,
  backLabel,
}: {
  /** Server-rendered "下一站" CTA; null off-plan. */
  nextStop?: React.ReactNode;
  nextHref?: string | null;
  wrongCount: number;
  onRetry: () => void;
  backHref: string;
  backLabel: string;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2.5">
      {nextStop}
      {!nextStop && nextHref ? (
        <Button asChild size="lg">
          <Link href={nextHref}>
            {t.common.nextExercise}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      ) : null}
      {wrongCount > 0 ? (
        <Button asChild variant="ghost" className="text-coral-ink hover:text-coral-ink">
          <Link href="/mistakes">
            <NotebookPen aria-hidden />
            {t.common.reviewWrongCta} · {wrongCount}
          </Link>
        </Button>
      ) : null}
      <div className="flex gap-2.5">
        <Button variant="outline" className="flex-1" onClick={onRetry}>
          {t.reading.tryAgain}
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
