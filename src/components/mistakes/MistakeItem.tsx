"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Callout } from "@/components/ui/callout";
import { retestMistake, type RetestResult } from "@/lib/actions/mistakes";
import { fill } from "@/lib/i18n/fill";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { McqMistakeVM } from "@/lib/mistakes";
import { AnswerOption, OPTION_GRID, type OptionState } from "@/components/exercise/AnswerOption";
import { MistakeCardShell, RetestButton, RetestOutcome, type CardMeta } from "./RetestParts";

const LETTERS = ["A", "B", "C", "D"];

/**
 * One wrong MCQ (reading/listening/exam/book quiz), re-answered in place.
 * Tapping an option grades it — the answer key only arrives in that retest
 * response. A wrong retest reveals the key and the explanation and offers
 * another try; a correct one clears the mistake (persisted server-side) and
 * "continue" moves the card to the cleared list.
 */
export function MistakeItem({
  mistake,
  meta,
  onCleared,
  onDismiss,
}: {
  mistake: McqMistakeVM;
  meta: CardMeta;
  onCleared: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  const contextId = useId();
  const [open, setOpen] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [graded, setGraded] = useState<RetestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const optionsRef = useRef<HTMLDivElement>(null);

  // Opening (or retrying) moves focus to the first option, so keyboard users
  // land where the next action is.
  useEffect(() => {
    if (open && !graded) optionsRef.current?.querySelector("button")?.focus();
  }, [open, graded]);

  function pick(index: number) {
    if (pending || graded) return;
    setChosen(index);
    setError(null);
    startTransition(async () => {
      try {
        const result = await retestMistake({
          kind: mistake.kind,
          refId: mistake.refId,
          questionId: mistake.questionId,
          chosenIndex: index,
        });
        setGraded(result);
        if (result.correct) onCleared();
      } catch {
        setChosen(null);
        setError(t.common.submitRetry);
      }
    });
  }

  function retry() {
    setChosen(null);
    setGraded(null);
  }

  function optionState(i: number): OptionState {
    if (!graded) return chosen === i ? "picked" : "idle";
    if (i === graded.correctIndex) return "correct";
    return i === chosen ? "wrong" : "muted";
  }

  const { question, context } = mistake;
  return (
    <MistakeCardShell kind={mistake.kind} meta={meta} highlighted={graded?.correct}>
      <p className="mt-2 text-[0.9375rem] leading-normal font-medium text-pretty">
        {question.stem}
      </p>

      {context ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowContext((s) => !s)}
            aria-expanded={showContext}
            aria-controls={contextId}
            className="rounded-sm py-1 text-[0.8125rem] font-medium text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showContext ? t.mistakes.hideContext : t.mistakes.showContext}
          </button>
          {showContext ? (
            <div
              id={contextId}
              className="mt-2 max-h-80 overflow-y-auto rounded-md bg-muted px-4 py-3 text-sm leading-relaxed text-soft-3"
            >
              {context.passage ? (
                <p className="font-serif text-[0.9375rem] whitespace-pre-line">{context.passage}</p>
              ) : null}
              {context.script ? (
                <div className="flex flex-col gap-1.5">
                  {context.script.map((line, i) => (
                    <p key={i}>
                      {line.speaker !== "narrator" ? (
                        <span className="mr-2 text-xs font-semibold text-muted-foreground">
                          {line.speaker}
                        </span>
                      ) : null}
                      {line.text}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <>
          <div
            ref={optionsRef}
            role="group"
            aria-label={question.stem}
            className={`mt-3.5 ${OPTION_GRID}`}
          >
            {question.options.map((option, i) => (
              <AnswerOption
                key={i}
                letter={LETTERS[i]}
                state={optionState(i)}
                disabled={pending || Boolean(graded)}
                onClick={() => pick(i)}
              >
                {option}
              </AnswerOption>
            ))}
          </div>
          {graded ? (
            <RetestOutcome
              correct={graded.correct}
              explanation={graded.explanationZh}
              askHref={`/tutor?ask=${encodeURIComponent(fill(t.mistakes.askPrompt, { q: question.stem }))}`}
              onRetry={retry}
              onContinue={onDismiss}
            />
          ) : null}
        </>
      ) : (
        <div className="mt-3">
          <RetestButton onClick={() => setOpen(true)} />
        </div>
      )}
      {error ? (
        <Callout variant="error" className="mt-3 px-3 py-2 text-sm">
          {error}
        </Callout>
      ) : null}
    </MistakeCardShell>
  );
}
