"use client";

import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ExercisePanel,
  ExerciseSplit,
  type ExerciseTab,
} from "@/components/exercise/ExerciseParts";
import { useExerciseAttempt } from "@/components/exercise/useExerciseAttempt";
import { PassageText } from "@/components/typography/PassageText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { SanitizedQuestion } from "@/content/types";
import type { GlossEntry } from "@/lib/gloss-core";
import { fill } from "@/lib/i18n/fill";
import { useT } from "@/lib/i18n/LocaleProvider";
import { GlossedText, hasGlossMatches } from "./GlossedText";

/**
 * A reading exercise. The passage underlines words the learner reviewed on
 * flashcards today; the result stays on the page — the score, every answer
 * explained, misses filed to the notebook — and names the next step.
 */
export function ReadingRunner({
  exerciseId,
  title,
  titleZh,
  genre,
  suggestedMinutes,
  passage,
  questions,
  glosses,
  nextStop,
  nextHref,
  crossPromo,
}: {
  exerciseId: string;
  title: string;
  titleZh: string;
  genre: string;
  suggestedMinutes: number;
  passage: string;
  questions: SanitizedQuestion[];
  glosses: GlossEntry[];
  /** Server-rendered next-stop CTA when this exercise is a plan stop. */
  nextStop?: React.ReactNode;
  /** First unattempted sibling exercise, resolved server-side. */
  nextHref?: string | null;
  crossPromo?: React.ReactNode;
}) {
  const t = useT();
  const [tab, setTab] = useState<ExerciseTab>("material");
  const attempt = useExerciseAttempt({
    kind: "reading",
    exerciseId,
    questions,
    onGraded: () => setTab("questions"),
  });
  const showLegend = useMemo(() => hasGlossMatches(passage, glosses), [passage, glosses]);
  const { answeredCount, result } = attempt;

  function toQuestions() {
    setTab("questions");
    window.scrollTo({ top: 0 });
  }

  return (
    <ExerciseSplit
      tab={tab}
      onTab={setTab}
      materialLabel={t.reading.passageTab}
      questionsLabel={
        result
          ? t.reading.questionsTab
          : `${t.reading.questionsTab} · ${answeredCount}/${questions.length}`
      }
      sticky={!result}
      material={
        <article>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{genre}</Badge>
            <span className="text-[0.8125rem] text-muted-foreground">
              {fill(t.reading.meta, { m: suggestedMinutes, n: questions.length })}
            </span>
          </div>
          <h1 className="mt-4 font-serif text-[1.75rem] leading-tight font-medium text-balance sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 font-serif text-base text-muted-foreground">{titleZh}</p>
          {showLegend ? (
            <Callout
              variant="accent"
              className="mt-5 flex items-center gap-2.5 px-3.5 py-2.5 text-[0.8125rem] leading-normal"
            >
              <span
                aria-hidden
                className="w-[1.375rem] shrink-0 border-b-2 border-dotted border-brand"
              />
              {t.reading.legend}
            </Callout>
          ) : null}
          <h2 className="sr-only">{t.reading.passage}</h2>
          <PassageText className="mt-6">
            <GlossedText text={passage} glosses={glosses} />
          </PassageText>
          {!result ? (
            <Button size="lg" className="mt-8 w-full md:hidden" onClick={toQuestions}>
              {t.reading.toQuestions}
              <ArrowRight aria-hidden />
            </Button>
          ) : null}
        </article>
      }
      panel={
        <ExercisePanel
          headingId="reading-questions"
          heading={t.reading.questions}
          questions={questions}
          attempt={attempt}
          submitLabel={t.reading.submitAnswers}
          nextStop={nextStop}
          nextHref={nextHref}
          backHref="/reading"
          backLabel={t.reading.backToList}
          after={crossPromo}
        />
      }
    />
  );
}
