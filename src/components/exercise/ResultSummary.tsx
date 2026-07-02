"use client";

import { Check, X } from "lucide-react";
import type { SanitizedQuestion } from "@/content/types";
import { useT } from "@/lib/i18n/LocaleProvider";

export interface GradedQuestion {
  questionId: string;
  correctIndex: number;
  explanationZh: string;
  correct: boolean;
}

const LETTERS = ["A", "B", "C", "D"];

export function ResultSummary({
  questions,
  answers,
  graded,
  score,
  total,
  children,
}: {
  questions: SanitizedQuestion[];
  answers: Record<string, number>;
  graded: GradedQuestion[];
  score: number;
  total: number;
  /** Extra content below the review, e.g. cross-promo or retry buttons. */
  children?: React.ReactNode;
}) {
  const t = useT();
  const gradedById = new Map(graded.map((g) => [g.questionId, g]));
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="border-y border-border py-6 text-center">
        <p className="font-mono text-2xs font-medium tracking-label text-muted-foreground uppercase">
          {t.common.score}
        </p>
        <p className="mt-2 font-mono text-4xl font-semibold tabular-nums">
          {score}
          <span className="text-xl font-medium text-muted-foreground/70"> / {total}</span>
        </p>
        {/* Below 60% the accuracy line takes the red pen. */}
        <p
          className={`mt-2 font-mono text-sm font-medium tabular-nums ${
            pct >= 60 ? "text-muted-foreground" : "text-cinnabar"
          }`}
        >
          {t.common.accuracy} {pct}%
        </p>
      </div>

      <ol className="space-y-6">
        {questions.map((q, qIndex) => {
          const result = gradedById.get(q.id);
          if (!result) return null;
          const chosen = answers[q.id];
          return (
            <li key={q.id} className="border-b border-border pb-6 last:border-0 last:pb-0">
              <p className="font-medium">
                <span aria-hidden>
                  {result.correct ? (
                    <Check className="inline size-4" />
                  ) : (
                    <X className="inline size-4 text-cinnabar" />
                  )}
                </span>{" "}
                {qIndex + 1}. {q.stem}
              </p>
              <div className="mt-3 space-y-1.5 text-sm">
                {q.options.map((option, i) => {
                  const isCorrect = i === result.correctIndex;
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
              {chosen === undefined && (
                <p className="mt-2 text-xs font-medium text-cinnabar">{t.exams.notAnswered}</p>
              )}
              <div className="mt-3 bg-muted p-3 text-sm text-foreground/80">
                <span className="font-semibold text-foreground">{t.reading.explanation}：</span>
                {result.explanationZh}
              </div>
            </li>
          );
        })}
      </ol>

      {children}
    </div>
  );
}
