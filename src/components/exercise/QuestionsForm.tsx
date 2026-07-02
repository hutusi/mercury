"use client";

import type { SanitizedQuestion } from "@/content/types";

const LETTERS = ["A", "B", "C", "D"];

export function QuestionsForm({
  questions,
  answers,
  onAnswer,
  disabled,
}: {
  questions: SanitizedQuestion[];
  answers: Record<string, number>;
  onAnswer: (questionId: string, optionIndex: number) => void;
  disabled?: boolean;
}) {
  return (
    <ol className="space-y-6">
      {questions.map((q, qIndex) => (
        <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-slate-900">
            {qIndex + 1}. {q.stem}
          </p>
          <div className="mt-3 space-y-2">
            {q.options.map((option, i) => {
              const selected = answers[q.id] === i;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAnswer(q.id, i)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                    selected
                      ? "border-brand-500 bg-brand-50 text-brand-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="pt-0.5">{option}</span>
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}
