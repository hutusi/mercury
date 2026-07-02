"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import type { ExamSection } from "@/content/types";
import type { AnswerMap } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/LocaleProvider";

const LETTERS = ["A", "B", "C", "D"];

export function AnswerReview({
  sections,
  answers,
}: {
  sections: ExamSection[];
  answers: AnswerMap;
}) {
  const t = useT();
  const [wrongOnly, setWrongOnly] = useState(true);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t.exams.reviewTitle}</h2>
        <button
          onClick={() => setWrongOnly((w) => !w)}
          className="rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
        >
          {wrongOnly ? t.exams.showAll : t.exams.showWrongOnly}
        </button>
      </div>

      {sections.map((section) => {
        let number = 0;
        const items = section.groups.flatMap((group) =>
          group.questions.map((q) => {
            number += 1;
            return { q, number };
          }),
        );
        const visible = items.filter(({ q }) => !wrongOnly || answers[q.id] !== q.correctIndex);
        if (visible.length === 0) return null;
        return (
          <div key={section.id} className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {section.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection} ·{" "}
              {section.titleZh}
            </h3>
            {visible.map(({ q, number: n }) => {
              const chosen = answers[q.id];
              const correct = chosen === q.correctIndex;
              return (
                <div
                  key={q.id}
                  className={`rounded-xl border bg-card p-5 shadow-xs ${
                    correct ? "border-green-500/20" : "border-destructive/20"
                  }`}
                >
                  <p className="font-medium">
                    <span aria-hidden>
                      {correct ? (
                        <CheckCircle2 className="inline size-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="inline size-4 text-destructive" />
                      )}
                    </span>{" "}
                    {n}. {q.stem}
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-green-700 dark:text-green-400">
                      {t.exams.correctAnswer}: {LETTERS[q.correctIndex]}.{" "}
                      {q.options[q.correctIndex]}
                    </p>
                    <p
                      className={
                        correct ? "text-green-700 dark:text-green-400" : "text-destructive"
                      }
                    >
                      {t.exams.yourAnswer}:{" "}
                      {chosen !== undefined
                        ? `${LETTERS[chosen]}. ${q.options[chosen]}`
                        : t.exams.notAnswered}
                    </p>
                  </div>
                  <div className="mt-3 rounded-lg bg-muted p-3 text-sm text-foreground/80">
                    {q.explanationZh}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
