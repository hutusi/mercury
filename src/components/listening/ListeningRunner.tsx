"use client";

import { ArrowRight, Lock } from "lucide-react";
import { useState } from "react";
import {
  ExercisePanel,
  ExerciseSplit,
  type ExerciseTab,
} from "@/components/exercise/ExerciseParts";
import { useExerciseAttempt } from "@/components/exercise/useExerciseAttempt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SanitizedQuestion, ScriptLine } from "@/content/types";
import { fill } from "@/lib/i18n/fill";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { TtsPlayer } from "./TtsPlayer";

/**
 * A listening exercise: the player, then the questions. The transcript stays
 * locked until the answers are in — reading along would turn it into a
 * reading exercise — and unlocks beside the explanations afterwards.
 */
export function ListeningRunner({
  exerciseId,
  title,
  titleZh,
  style,
  script,
  audioUrl,
  questions,
  nextStop,
  nextHref,
  crossPromo,
}: {
  exerciseId: string;
  title: string;
  titleZh: string;
  style: string;
  script: ScriptLine[];
  audioUrl?: string | null;
  questions: SanitizedQuestion[];
  /** Server-rendered next-stop CTA when this exercise is a plan stop. */
  nextStop?: React.ReactNode;
  /** First unattempted sibling exercise, resolved server-side. */
  nextHref?: string | null;
  crossPromo?: React.ReactNode;
}) {
  const t = useT();
  const [tab, setTab] = useState<ExerciseTab>("material");
  const attempt = useExerciseAttempt({
    kind: "listening",
    exerciseId,
    questions,
    onGraded: () => setTab("questions"),
  });
  const { answeredCount, result } = attempt;

  function toQuestions() {
    setTab("questions");
    window.scrollTo({ top: 0 });
  }

  return (
    <ExerciseSplit
      tab={tab}
      onTab={setTab}
      materialLabel={t.listening.material}
      questionsLabel={
        result
          ? t.reading.questionsTab
          : `${t.reading.questionsTab} · ${answeredCount}/${questions.length}`
      }
      sticky={!result}
      material={
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{style}</Badge>
            <span className="text-[0.8125rem] text-muted-foreground">
              {fill(t.listening.meta, { n: questions.length })}
            </span>
          </div>
          <h1 className="mt-4 font-serif text-[1.75rem] leading-tight font-medium text-balance sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 font-serif text-base text-muted-foreground">{titleZh}</p>
          <TtsPlayer script={script} audioUrl={audioUrl} className="mt-6" />
          {result ? (
            <section aria-labelledby="listening-transcript" className="mt-8">
              <h2 id="listening-transcript" className="text-[0.9375rem] font-semibold">
                {t.listening.transcript}
              </h2>
              <ol className="mt-4 flex flex-col gap-3.5">
                {script.map((line, i) => (
                  <li key={i} className="flex gap-3 text-[0.9375rem] leading-[1.7]">
                    {line.speaker !== "narrator" ? (
                      <span
                        className={cn(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          line.speaker === "A"
                            ? "bg-brand-soft text-brand-ink"
                            : "bg-track text-soft-2",
                        )}
                      >
                        <span aria-hidden>{line.speaker}</span>
                        <span className="sr-only">
                          {fill(t.listening.speaker, { s: line.speaker })}
                        </span>
                      </span>
                    ) : null}
                    <p className={cn("text-pretty", line.speaker === "narrator" && "text-soft")}>
                      {line.text}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <>
              <p className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-dashed border-input px-4 py-3 text-center text-[0.8125rem] text-muted-foreground">
                <Lock className="size-3.5 shrink-0" aria-hidden />
                {t.listening.transcriptLocked}
              </p>
              <Button size="lg" className="mt-8 w-full md:hidden" onClick={toQuestions}>
                {t.listening.toQuestions}
                <ArrowRight aria-hidden />
              </Button>
            </>
          )}
        </div>
      }
      panel={
        <ExercisePanel
          headingId="listening-questions"
          heading={t.reading.questions}
          questions={questions}
          attempt={attempt}
          submitLabel={t.listening.submitAnswers}
          nextStop={nextStop}
          nextHref={nextHref}
          backHref="/listening"
          backLabel={t.reading.backToList}
          after={crossPromo}
        />
      }
    />
  );
}
