"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { NextStepFooter } from "@/components/exercise/NextStepFooter";
import { ResultSummary } from "@/components/exercise/ResultSummary";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { PassageText } from "@/components/typography/PassageText";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { SanitizedQuestion } from "@/content/types";
import { submitExerciseAttempt, type GradedExercise } from "@/lib/actions/attempts";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { useT } from "@/lib/i18n/LocaleProvider";

export function ReadingRunner({
  exerciseId,
  passage,
  questions,
  crossPromo,
  nextHref,
}: {
  exerciseId: string;
  passage: string;
  questions: SanitizedQuestion[];
  crossPromo?: React.ReactNode;
  /** First unattempted sibling exercise, resolved server-side. */
  nextHref?: string | null;
}) {
  const t = useT();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GradedExercise | null>(null);
  const [usedSeconds, setUsedSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);
  const requestRef = useRef<LogicalRequestId | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function submit() {
    setError(null);
    const duration = Math.round((Date.now() - startedAt.current) / 1000);
    startTransition(async () => {
      try {
        // A retry after a lost response reuses the same id (answers unchanged),
        // so the server replays instead of writing a second attempt.
        const request = requestIdForInput(requestRef.current, JSON.stringify(answers));
        requestRef.current = request;
        const graded = await submitExerciseAttempt({
          requestId: request.requestId,
          kind: "reading",
          refId: exerciseId,
          answers,
          durationSeconds: duration,
        });
        requestRef.current = null;
        setUsedSeconds(duration);
        setResult(graded);
        window.scrollTo({ top: 0 });
      } catch {
        setError(t.common.submitRetry);
      }
    });
  }

  const answeredCount = Object.keys(answers).length;

  if (result) {
    return (
      <ResultSummary
        questions={questions}
        answers={answers}
        graded={result.perQuestion}
        score={result.score}
        total={result.total}
      >
        {crossPromo}
        <NextStepFooter
          nextHref={nextHref}
          wrongCount={result.perQuestion.filter((q) => !q.correct).length}
          backHref="/reading"
          backLabel={t.reading.backToList}
        />
      </ResultSummary>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <article className="border-y border-border py-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        <SectionLabel as="h2" className="mb-3">
          {t.reading.passage}
        </SectionLabel>
        <PassageText className="space-y-4">{passage}</PassageText>
      </article>

      <div className="space-y-6">
        <QuestionsForm
          questions={questions}
          answers={answers}
          onAnswer={(id, i) => setAnswers((a) => ({ ...a, [id]: i }))}
        />
        {error && (
          <Callout variant="error" className="p-3 text-center text-sm">
            {error}
          </Callout>
        )}
        <Button
          onClick={submit}
          disabled={pending || answeredCount < questions.length}
          size="lg"
          className="h-11 w-full disabled:cursor-not-allowed"
        >
          {pending
            ? t.common.loading
            : `${t.reading.submitAnswers} (${answeredCount}/${questions.length})`}
        </Button>
      </div>
    </div>
  );
}
