"use client";

import type { SanitizedQuestion } from "@/content/types";

const LETTERS = ["A", "B", "C", "D"];

export function QuestionsForm({
  questions,
  answers,
  onAnswer,
  disabled,
  numbered = true,
}: {
  questions: SanitizedQuestion[];
  answers: Record<string, number>;
  onAnswer: (questionId: string, optionIndex: number) => void;
  disabled?: boolean;
  /** Set false when the caller already embeds numbering in the stem. */
  numbered?: boolean;
}) {
  return (
    <ol className="space-y-6">
      {questions.map((q, qIndex) => (
        <li key={q.id} className="rounded-xl border bg-card p-5 shadow-xs">
          <p className="font-medium">
            {numbered ? `${qIndex + 1}. ` : ""}
            {q.stem}
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
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground/80 hover:border-primary/50 hover:bg-muted"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
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
