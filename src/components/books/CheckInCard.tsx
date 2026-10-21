"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { AnswerOption, OPTION_GRID, type OptionState } from "@/components/exercise/AnswerOption";
import type { SanitizedQuestion } from "@/content/types";
import { answerBookCheckIn, type CheckInResult } from "@/lib/actions/books";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];

/**
 * One low-stakes check-in rendered inline after its section. Answering asks
 * the server for the reveal; nothing is persisted, and losing the state on
 * refresh is fine by design. Never blocks reading on.
 */
export function CheckInCard({
  bookId,
  chapterId,
  question,
}: {
  bookId: string;
  chapterId: string;
  question: SanitizedQuestion;
}) {
  const t = useT();
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(index: number) {
    if (result || pending) return;
    setError(false);
    setChosen(index);
    startTransition(async () => {
      try {
        setResult(
          await answerBookCheckIn({
            bookId,
            chapterId,
            questionId: question.id,
            chosenIndex: index,
          }),
        );
      } catch {
        setChosen(null);
        setError(true);
      }
    });
  }

  function stateOf(i: number): OptionState {
    if (!result) return chosen === i ? "picked" : "idle";
    if (i === result.correctIndex) return "correct";
    return i === chosen ? "wrong" : "muted";
  }

  return (
    <aside
      className="rounded-xl border border-border bg-card px-5 py-[1.125rem] font-sans"
      aria-label={t.books.checkInLabel}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[0.8125rem] font-semibold text-soft-2">{t.books.checkInLabel}</h3>
        {result ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[0.8125rem] font-medium",
              result.correct ? "text-brand-ink" : "text-coral-ink",
            )}
          >
            {result.correct ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <X className="size-3.5" aria-hidden />
            )}
            {result.correct ? t.books.checkInCorrect : t.books.checkInIncorrect}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[0.9375rem] leading-normal font-medium text-pretty">
        {question.stem}
      </p>
      <div className={`mt-3 ${OPTION_GRID}`} role="group" aria-label={question.stem}>
        {question.options.map((option, i) => (
          <AnswerOption
            key={i}
            letter={LETTERS[i]}
            state={stateOf(i)}
            disabled={result !== null || pending}
            onClick={() => choose(i)}
          >
            {option}
          </AnswerOption>
        ))}
      </div>
      {result ? (
        <div className="mt-3 rounded-md bg-muted px-3.5 py-3 text-sm leading-[1.75] text-soft-3">
          <span className="font-semibold text-foreground">{t.reading.explanationLabel}</span>
          {result.explanationZh}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t.common.submitRetry}
        </p>
      ) : null}
    </aside>
  );
}
