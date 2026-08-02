"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import type { SanitizedQuestion } from "@/content/types";
import { answerBookCheckIn, type CheckInResult } from "@/lib/actions/books";
import { useT } from "@/lib/i18n/LocaleProvider";

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

  return (
    <aside className="border border-border p-4 sm:p-5" aria-label={t.books.checkInLabel}>
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel as="h3">{t.books.checkInLabel}</SectionLabel>
        {result && (
          <span
            className={`inline-flex items-center gap-1 font-mono text-xs font-medium ${
              result.correct ? "text-foreground" : "text-cinnabar"
            }`}
          >
            {result.correct ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <X className="size-3.5" aria-hidden />
            )}
            {result.correct ? t.books.checkInCorrect : t.books.checkInIncorrect}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-medium">{question.stem}</p>
      <div className="mt-3 space-y-1.5" role="group" aria-label={question.stem}>
        {question.options.map((option, i) => {
          const isChosen = chosen === i;
          const isCorrect = result !== null && i === result.correctIndex;
          return (
            <button
              key={i}
              type="button"
              disabled={result !== null || pending}
              onClick={() => choose(i)}
              aria-pressed={isChosen}
              className={`flex w-full items-start gap-2.5 border px-3 py-2 text-left text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default ${
                isCorrect
                  ? "border-foreground bg-muted font-medium text-foreground"
                  : isChosen && result && !result.correct
                    ? "border-cinnabar/40 bg-cinnabar/10 text-cinnabar"
                    : isChosen
                      ? "border-foreground bg-muted font-medium text-foreground"
                      : result
                        ? "border-border text-muted-foreground"
                        : "border-border text-foreground/80 hover:border-input hover:bg-muted/50"
              }`}
            >
              <span className="font-mono text-xs font-medium">{LETTERS[i]}.</span>
              <span>{option}</span>
              {isCorrect && <Check className="mt-0.5 ml-auto size-4 shrink-0" aria-hidden />}
            </button>
          );
        })}
      </div>
      {result && (
        <div className="mt-3 bg-muted p-3 text-sm text-foreground/80">
          <span className="font-semibold text-foreground">{t.reading.explanationLabel}</span>
          {result.explanationZh}
        </div>
      )}
      {error && <p className="mt-3 text-xs font-medium text-cinnabar">{t.exams.submitFailed}</p>}
    </aside>
  );
}
