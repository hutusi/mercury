"use client";

import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useEffect, useRef, useState, useTransition } from "react";
import { ResultSummary } from "@/components/exercise/ResultSummary";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import type { SanitizedQuestion } from "@/content/types";
import { submitExerciseAttempt, type GradedExercise } from "@/lib/actions/attempts";
import { useT } from "@/lib/i18n/LocaleProvider";

export function ReadingRunner({
  exerciseId,
  passage,
  questions,
  crossPromo,
}: {
  exerciseId: string;
  passage: string;
  questions: SanitizedQuestion[];
  crossPromo?: React.ReactNode;
}) {
  const t = useT();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GradedExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const graded = await submitExerciseAttempt({
          kind: "reading",
          refId: exerciseId,
          answers,
          durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
        });
        setResult(graded);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setError(t.exams.submitFailed);
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
        <div className="flex items-center justify-between">
          <Link
            href="/reading"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {t.reading.backToList}
          </Link>
        </div>
        {crossPromo}
      </ResultSummary>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <article className="border-y border-border py-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        <SectionLabel as="h2" className="mb-3">
          {t.reading.passage}
        </SectionLabel>
        <div className="space-y-4 font-serif leading-relaxed whitespace-pre-line text-foreground/90">
          {passage}
        </div>
      </article>

      <div className="space-y-6">
        <QuestionsForm
          questions={questions}
          answers={answers}
          onAnswer={(id, i) => setAnswers((a) => ({ ...a, [id]: i }))}
        />
        {error && (
          <p className="border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </p>
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
