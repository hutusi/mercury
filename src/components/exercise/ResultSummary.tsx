"use client";

import { CheckCircle2, XCircle } from "lucide-react";
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
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 text-center shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">{t.common.score}</p>
        <p className="mt-1 text-4xl font-bold">
          {score}
          <span className="text-xl font-medium text-muted-foreground/70"> / {total}</span>
        </p>
        <p
          className={`mt-2 text-sm font-semibold ${pct >= 60 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
        >
          {t.common.accuracy} {pct}%
        </p>
      </div>

      <ol className="space-y-4">
        {questions.map((q, qIndex) => {
          const result = gradedById.get(q.id);
          if (!result) return null;
          const chosen = answers[q.id];
          return (
            <li
              key={q.id}
              className={`rounded-xl border bg-card p-5 shadow-xs ${
                result.correct ? "border-green-500/20" : "border-destructive/20"
              }`}
            >
              <p className="font-medium">
                <span aria-hidden>
                  {result.correct ? (
                    <CheckCircle2 className="inline size-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="inline size-4 text-destructive" />
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
                      className={`flex items-start gap-2 rounded-lg px-3 py-1.5 ${
                        isCorrect
                          ? "bg-green-500/10 font-medium text-green-700 dark:text-green-400"
                          : isChosen
                            ? "bg-destructive/10 text-destructive line-through"
                            : "text-muted-foreground"
                      }`}
                    >
                      <span className="font-bold">{LETTERS[i]}.</span>
                      <span>{option}</span>
                    </div>
                  );
                })}
              </div>
              {chosen === undefined && (
                <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                  {t.exams.notAnswered}
                </p>
              )}
              <div className="mt-3 rounded-lg bg-muted p-3 text-sm text-foreground/80">
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
