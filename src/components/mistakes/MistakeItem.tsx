"use client";

import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { useState, useTransition } from "react";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { retestMistake, type RetestResult } from "@/lib/actions/mistakes";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import type { McqMistakeVM } from "@/lib/mistakes";

const LETTERS = ["A", "B", "C", "D"];

/**
 * One wrong MCQ (reading/listening/exam): expandable, re-answerable. The
 * answer key arrives only in the retest response — a wrong re-test reveals
 * the correct answer + explanation and offers another try; a correct one
 * clears the mistake (persisted server-side).
 */
export function MistakeItem({
  mistake,
  onCleared,
}: {
  mistake: McqMistakeVM;
  onCleared?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [chosen, setChosen] = useState<number | undefined>(undefined);
  const [graded, setGraded] = useState<RetestResult | null>(null);
  const [clearedNow, setClearedNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cleared = mistake.cleared || clearedNow;
  const date = new Date(mistake.lastWrongAt).toLocaleDateString(
    locale === "zh" ? "zh-CN" : "en-US",
    { month: "short", day: "numeric" },
  );

  function submit() {
    if (chosen === undefined || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await retestMistake({
          kind: mistake.kind,
          refId: mistake.refId,
          questionId: mistake.questionId,
          chosenIndex: chosen,
        });
        setGraded(result);
        if (result.correct) {
          setClearedNow(true);
          onCleared?.();
        }
      } catch {
        setError(t.exams.submitFailed);
      }
    });
  }

  function tryAgain() {
    setChosen(undefined);
    setGraded(null);
  }

  return (
    <li className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <span aria-hidden className="mt-0.5 shrink-0">
          {cleared ? <Check className="size-4" /> : <X className="size-4 text-cinnabar" />}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-medium ${cleared ? "text-muted-foreground" : ""}`}
          >
            {mistake.question.stem}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{mistake.sourceTitleZh}</Badge>
            <span className="font-mono tabular-nums">
              {t.mistakes.wrongLabel} ×{mistake.wrongCount}
            </span>
            <span>
              {t.mistakes.lastWrong} {date}
            </span>
          </span>
        </span>
        <span aria-hidden className="mt-0.5 shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 pb-5 pl-7">
          {mistake.context && (
            <div>
              <button
                type="button"
                onClick={() => setShowContext((s) => !s)}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {showContext ? t.mistakes.hideContext : t.mistakes.showContext}
              </button>
              {showContext && (
                <div className="mt-2 border-l-2 border-border pl-4 text-sm text-foreground/80">
                  {mistake.context.passage && (
                    <p className="font-serif whitespace-pre-line">{mistake.context.passage}</p>
                  )}
                  {mistake.context.script && (
                    <div className="space-y-1">
                      {mistake.context.script.map((line, i) => (
                        <p key={i}>
                          <span className="font-mono text-xs text-muted-foreground">
                            {line.speaker}
                          </span>{" "}
                          {line.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {cleared && !graded ? null : graded ? (
            <div className="space-y-3">
              <div className="space-y-1.5 text-sm">
                {mistake.question.options.map((option, i) => {
                  const isCorrect = i === graded.correctIndex;
                  const isChosen = i === chosen;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-2 px-3 py-1.5 ${
                        isCorrect
                          ? "bg-muted font-medium text-foreground"
                          : isChosen
                            ? "bg-cinnabar/10 text-cinnabar line-through"
                            : "text-muted-foreground"
                      }`}
                    >
                      <span className="font-mono font-medium">{LETTERS[i]}.</span>
                      <span>{option}</span>
                      {isCorrect && (
                        <Check className="mt-0.5 ml-auto size-4 shrink-0" aria-hidden />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="bg-muted p-3 text-sm text-foreground/80">
                <span className="font-semibold text-foreground">{t.reading.explanation}：</span>
                {graded.explanationZh}
              </div>
              {graded.correct ? (
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Check className="size-4" aria-hidden />
                  {t.mistakes.retestCorrect}
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-cinnabar">
                    <X className="size-4" aria-hidden />
                    {t.mistakes.retestWrong}
                  </p>
                  <Button variant="outline" size="sm" onClick={tryAgain}>
                    {t.common.tryAgain}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <QuestionsForm
                questions={[mistake.question]}
                answers={chosen === undefined ? {} : { [mistake.question.id]: chosen }}
                onAnswer={(_, optionIndex) => setChosen(optionIndex)}
                disabled={pending}
                numbered={false}
              />
              <Button onClick={submit} disabled={chosen === undefined || pending}>
                {t.common.submit}
              </Button>
              {error && <p className="text-sm font-medium text-cinnabar">{error}</p>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
