"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
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
        <h2 className="font-serif text-xl font-medium">{t.exams.reviewTitle}</h2>
        <Button variant="outline" size="sm" onClick={() => setWrongOnly((w) => !w)}>
          {wrongOnly ? t.exams.showAll : t.exams.showWrongOnly}
        </Button>
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
            <SectionLabel as="h3">
              {section.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection} ·{" "}
              {section.titleZh}
            </SectionLabel>
            <div className="divide-y divide-border border-y border-border">
              {visible.map(({ q, number: n }) => {
                const chosen = answers[q.id];
                const correct = chosen === q.correctIndex;
                return (
                  <div key={q.id} className="py-5">
                    <p className="font-medium">
                      <span aria-hidden>
                        {correct ? (
                          <Check className="inline size-4" />
                        ) : (
                          <X className="inline size-4 text-cinnabar" />
                        )}
                      </span>{" "}
                      {n}. {q.stem}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="font-medium text-foreground">
                        {t.exams.correctAnswer}: {LETTERS[q.correctIndex]}.{" "}
                        {q.options[q.correctIndex]}
                      </p>
                      <p className={correct ? "text-muted-foreground" : "text-cinnabar"}>
                        {t.exams.yourAnswer}:{" "}
                        {chosen !== undefined
                          ? `${LETTERS[chosen]}. ${q.options[chosen]}`
                          : t.exams.notAnswered}
                      </p>
                    </div>
                    <div className="mt-3 bg-muted p-3 text-sm text-foreground/80">
                      {q.explanationZh}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
