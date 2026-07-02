"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { ResultSummary } from "@/components/exercise/ResultSummary";
import type { SanitizedQuestion, ScriptLine } from "@/content/types";
import { submitExerciseAttempt, type GradedExercise } from "@/lib/actions/attempts";
import { useT } from "@/lib/i18n/LocaleProvider";
import { TtsPlayer } from "./TtsPlayer";

export function ListeningRunner({
  exerciseId,
  script,
  questions,
  crossPromo,
}: {
  exerciseId: string;
  script: ScriptLine[];
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
          kind: "listening",
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
      <div className="space-y-6">
        <ResultSummary
          questions={questions}
          answers={answers}
          graded={result.perQuestion}
          score={result.score}
          total={result.total}
        />
        {/* Transcript unlocks only after submission */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            {t.listening.transcript}
          </h2>
          <div className="space-y-3">
            {script.map((line, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-800">
                {line.speaker !== "narrator" && (
                  <span
                    className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${
                      line.speaker === "A" ? "bg-brand-500" : "bg-accent-500"
                    }`}
                  >
                    {line.speaker}
                  </span>
                )}
                {line.text}
              </p>
            ))}
          </div>
        </div>
        <Link href="/listening" className="inline-block text-sm font-medium text-brand-600 hover:underline">
          ← {t.reading.backToList}
        </Link>
        {crossPromo}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TtsPlayer script={script} />
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500">
        <span aria-hidden>🔒</span> {t.listening.transcriptLocked}
      </div>
      <QuestionsForm
        questions={questions}
        answers={answers}
        onAnswer={(id, i) => setAnswers((a) => ({ ...a, [id]: i }))}
      />
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        onClick={submit}
        disabled={pending || answeredCount < questions.length}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? t.common.loading : `${t.listening.submitAnswers} (${answeredCount}/${questions.length})`}
      </button>
    </div>
  );
}
