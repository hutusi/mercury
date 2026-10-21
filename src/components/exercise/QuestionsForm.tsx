"use client";

import { Check, MessageCircle, NotebookPen, X } from "lucide-react";
import type { SanitizedQuestion } from "@/content/types";
import { useT } from "@/lib/i18n/LocaleProvider";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];

export interface GradedQuestion {
  questionId: string;
  correctIndex: number;
  explanationZh: string;
  correct: boolean;
}

/**
 * MCQs as cards. Answering: lettered options, the pick in dusk blue. After
 * grading (pass `graded`): the correct option in dusk blue with a check, a
 * wrong pick in coral with a cross and a strike, the Chinese explanation,
 * "added to mistakes", and a way to ask the tutor — so the result teaches,
 * not just scores.
 */
export function QuestionsForm({
  questions,
  answers,
  onAnswer,
  disabled,
  numbered = true,
  graded,
  askTutor = true,
}: {
  questions: SanitizedQuestion[];
  answers: Record<string, number>;
  onAnswer?: (questionId: string, optionIndex: number) => void;
  disabled?: boolean;
  /** Set false when the caller already embeds numbering in the stem. */
  numbered?: boolean;
  /** Review mode: per-question key and explanation. */
  graded?: GradedQuestion[];
  /** Offer "ask the tutor" under each explanation. */
  askTutor?: boolean;
}) {
  const t = useT();
  const gradedById = graded ? new Map(graded.map((g) => [g.questionId, g])) : null;

  return (
    <ol className="flex flex-col gap-3.5">
      {/* E2E DOM contract: each question is an li whose option group is a
          direct-child div of direct-child buttons (li > div > button). */}
      {questions.map((q, qIndex) => {
        const result = gradedById?.get(q.id);
        const chosen = answers[q.id];
        return (
          <li key={q.id} className="rounded-xl border border-border bg-card p-[1.125rem]">
            <p className="flex gap-2.5">
              {numbered ? (
                <span className="shrink-0 font-serif text-[0.9375rem] leading-normal text-brand-ink italic">
                  {qIndex + 1}
                </span>
              ) : null}
              <span className="text-[0.9375rem] leading-normal font-medium text-pretty">
                {q.stem}
              </span>
            </p>
            <div className="mt-3 flex flex-col gap-1.5" role="group" aria-label={q.stem}>
              {q.options.map((option, i) => {
                const selected = chosen === i;
                const isCorrect = result ? i === result.correctIndex : false;
                const wrongPick = result ? selected && !isCorrect : false;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled || Boolean(result)}
                    onClick={() => onAnswer?.(q.id, i)}
                    aria-pressed={result ? undefined : selected}
                    className={cn(
                      "flex min-h-[2.875rem] w-full items-center gap-3 rounded-md border-[1.5px] px-3 py-2 text-left text-sm leading-[1.45] outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                      result
                        ? isCorrect
                          ? "border-brand bg-brand-soft"
                          : wrongPick
                            ? "border-coral bg-coral-soft text-muted-foreground"
                            : "border-border bg-card text-muted-foreground"
                        : selected
                          ? "border-brand bg-brand-soft"
                          : "border-border bg-card hover:border-input hover:bg-muted",
                      !result && "disabled:cursor-not-allowed disabled:opacity-60",
                      result && "cursor-default",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        (result ? isCorrect : selected)
                          ? "bg-brand text-brand-foreground"
                          : wrongPick
                            ? "bg-coral text-coral-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className={cn("flex-1", wrongPick && "line-through")}>{option}</span>
                    {result && isCorrect ? (
                      <Check className="size-[1.125rem] shrink-0 text-brand" aria-hidden />
                    ) : null}
                    {wrongPick ? (
                      <X className="size-[1.125rem] shrink-0 text-coral" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {result ? (
              <>
                {chosen === undefined ? (
                  <p className="mt-2 text-xs font-medium text-coral-ink">{t.exams.notAnswered}</p>
                ) : null}
                <div className="mt-3 rounded-md bg-muted px-3.5 py-3 text-sm leading-[1.75] text-soft-3">
                  <span className="font-semibold text-foreground">
                    {t.reading.explanationLabel}
                  </span>
                  {result.explanationZh}
                </div>
                {!result.correct ? (
                  <p className="mt-2.5 flex items-center gap-2 text-[0.8125rem] font-medium text-coral-ink">
                    <NotebookPen className="size-[0.9375rem]" aria-hidden />
                    {t.reading.added}
                  </p>
                ) : null}
                {askTutor ? (
                  <Link
                    href={`/tutor?ask=${encodeURIComponent(fill(t.reading.askPrompt, { q: q.stem }))}`}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-sm py-1.5 text-[0.8125rem] font-medium text-brand-ink outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MessageCircle className="size-3.5" aria-hidden />
                    {t.reading.ask}
                  </Link>
                ) : null}
              </>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
