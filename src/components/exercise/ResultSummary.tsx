"use client";

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
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">{t.common.score}</p>
        <p className="mt-1 text-4xl font-bold text-slate-900">
          {score}
          <span className="text-xl font-medium text-slate-400"> / {total}</span>
        </p>
        <p
          className={`mt-2 text-sm font-semibold ${pct >= 60 ? "text-green-600" : "text-amber-600"}`}
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
              className={`rounded-xl border bg-white p-5 shadow-sm ${
                result.correct ? "border-green-200" : "border-red-200"
              }`}
            >
              <p className="font-medium text-slate-900">
                <span aria-hidden>{result.correct ? "✅" : "❌"}</span> {qIndex + 1}. {q.stem}
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
                          ? "bg-green-50 font-medium text-green-800"
                          : isChosen
                            ? "bg-red-50 text-red-700 line-through"
                            : "text-slate-600"
                      }`}
                    >
                      <span className="font-bold">{LETTERS[i]}.</span>
                      <span>{option}</span>
                    </div>
                  );
                })}
              </div>
              {chosen === undefined && (
                <p className="mt-2 text-xs font-medium text-amber-600">{t.exams.notAnswered}</p>
              )}
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{t.reading.explanation}：</span>
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
