"use client";

import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useEffect, useRef, useState, useTransition } from "react";
import { ResultSummary } from "@/components/exercise/ResultSummary";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
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
          <Link href="/reading" className="text-sm font-medium text-primary hover:underline">
            ← {t.reading.backToList}
          </Link>
        </div>
        {crossPromo}
      </ResultSummary>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <article className="rounded-xl border bg-card p-6 shadow-xs lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t.reading.passage}
        </h2>
        <div className="space-y-4 leading-relaxed whitespace-pre-line text-foreground/80">
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
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          onClick={submit}
          disabled={pending || answeredCount < questions.length}
          className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending
            ? t.common.loading
            : `${t.reading.submitAnswers} (${answeredCount}/${questions.length})`}
        </button>
      </div>
    </div>
  );
}
