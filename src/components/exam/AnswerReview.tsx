"use client";

import { useState } from "react";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { ExamSection } from "@/content/types";
import type { AnswerMap } from "@/lib/db/schema";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * The finished exam, question by question, in the same graded cards as the
 * exercises (the attempt is over, so the keys may ship). Wrong ones first —
 * that's where the learning is — with the full paper a tap away.
 */
export function AnswerReview({
  sections,
  answers,
}: {
  sections: ExamSection[];
  answers: AnswerMap;
}) {
  const t = useT();
  const [filter, setFilter] = useState<"wrong" | "all">("wrong");

  return (
    <section aria-labelledby="exam-review" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="exam-review" className="font-serif text-xl font-medium">
          {t.exams.reviewTitle}
        </h2>
        <SegmentedControl
          label={t.exams.reviewTitle}
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "wrong", label: t.exams.showWrongOnly },
            { value: "all", label: t.exams.showAll },
          ]}
        />
      </div>

      {sections.map((section) => {
        const questions = section.groups.flatMap((g) => g.questions);
        const numbers = Object.fromEntries(questions.map((q, i) => [q.id, i + 1]));
        const visible = questions.filter(
          (q) => filter === "all" || answers[q.id] !== q.correctIndex,
        );
        if (visible.length === 0) return null;
        return (
          <div key={section.id} className="flex flex-col gap-3">
            <h3 className="text-[0.9375rem] font-semibold">
              {section.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection}
              <span className="ml-2 font-normal text-muted-foreground">{section.titleZh}</span>
            </h3>
            <QuestionsForm
              questions={visible.map(({ id, stem, options }) => ({ id, stem, options }))}
              answers={answers}
              numbers={numbers}
              graded={visible.map((q) => ({
                questionId: q.id,
                correctIndex: q.correctIndex,
                explanationZh: q.explanationZh,
                correct: answers[q.id] === q.correctIndex,
              }))}
            />
          </div>
        );
      })}
    </section>
  );
}
