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
      {/* E2E DOM contract: each question is an li whose option group is a
          direct-child div of direct-child buttons (li > div > button). */}
      {questions.map((q, qIndex) => (
        <li key={q.id} className="border-b border-border pb-6 last:border-0 last:pb-0">
          <p className="font-medium">
            {numbered ? `${qIndex + 1}. ` : ""}
            {q.stem}
          </p>
          <div className="mt-3 space-y-2" role="group" aria-label={q.stem}>
            {q.options.map((option, i) => {
              const selected = answers[q.id] === i;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAnswer(q.id, i)}
                  aria-pressed={selected}
                  className={`flex w-full items-start gap-3 border px-3 py-2.5 text-left text-sm outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    selected
                      ? "border-foreground bg-muted font-medium text-foreground"
                      : "border-border text-foreground/80 hover:border-input hover:bg-muted/50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-medium ${
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
