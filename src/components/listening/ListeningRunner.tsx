"use client";

import { Lock } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { NextStepFooter } from "@/components/exercise/NextStepFooter";
import { ResultSummary } from "@/components/exercise/ResultSummary";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { SanitizedQuestion, ScriptLine } from "@/content/types";
import { submitExerciseAttempt, type GradedExercise } from "@/lib/actions/attempts";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { useT } from "@/lib/i18n/LocaleProvider";
import { TtsPlayer } from "./TtsPlayer";

export function ListeningRunner({
  exerciseId,
  script,
  audioUrl,
  questions,
  crossPromo,
  nextHref,
}: {
  exerciseId: string;
  script: ScriptLine[];
  audioUrl?: string | null;
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
          kind: "listening",
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
      <div className="space-y-6">
        <ResultSummary
          questions={questions}
          answers={answers}
          graded={result.perQuestion}
          score={result.score}
          total={result.total}
          durationSeconds={usedSeconds ?? undefined}
        />
        {/* Transcript unlocks only after submission */}
        <div className="border-y border-border py-6">
          <SectionLabel as="h2" className="mb-4">
            {t.listening.transcript}
          </SectionLabel>
          <div className="space-y-3">
            {script.map((line, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/80">
                {line.speaker !== "narrator" && (
                  <span
                    className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded-sm font-mono text-xs font-medium ${
                      line.speaker === "A"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
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
        <NextStepFooter
          nextHref={nextHref}
          wrongCount={result.perQuestion.filter((q) => !q.correct).length}
          backHref="/listening"
          backLabel={t.reading.backToList}
        />
        {crossPromo}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TtsPlayer script={script} audioUrl={audioUrl} />
      <div className="border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
        <span aria-hidden>
          <Lock className="inline size-4" />
        </span>{" "}
        {t.listening.transcriptLocked}
      </div>
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
          : `${t.listening.submitAnswers} (${answeredCount}/${questions.length})`}
      </Button>
    </div>
  );
}
