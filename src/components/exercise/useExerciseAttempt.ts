"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { SanitizedQuestion } from "@/content/types";
import { submitExerciseAttempt, type GradedExercise } from "@/lib/actions/attempts";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { useFlowCounter, useFlowExit } from "@/lib/flow-store";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useAnswerDraft } from "./useAnswerDraft";

/**
 * One reading/listening attempt: picked answers (drafted to the session so a
 * reload keeps them), an idempotent submit, the graded result, and a retry
 * that starts over in place. Also drives the flow header's "2 / 3" counter
 * and the exit's "progress saved" policy.
 */
export function useExerciseAttempt({
  kind,
  exerciseId,
  questions,
  onGraded,
}: {
  kind: "reading" | "listening";
  exerciseId: string;
  questions: readonly SanitizedQuestion[];
  onGraded?: () => void;
}) {
  const t = useT();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GradedExercise | null>(null);
  const [usedSeconds, setUsedSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);
  const requestRef = useRef<LogicalRequestId | null>(null);
  const answeredCount = Object.keys(answers).length;

  useFlowCounter(result ? null : `${answeredCount} / ${questions.length}`);
  // Picked answers persist (session draft), so leaving mid-way is safe and
  // the exit says so.
  useFlowExit("saved", !result && answeredCount > 0);
  const draft = useAnswerDraft({
    kind,
    id: exerciseId,
    questions,
    answers,
    enabled: !result && !pending,
    onRestore: setAnswers,
  });

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function answer(questionId: string, optionIndex: number) {
    setAnswers((a) => ({ ...a, [questionId]: optionIndex }));
  }

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
          kind,
          refId: exerciseId,
          answers,
          durationSeconds: duration,
        });
        requestRef.current = null;
        draft.clear();
        setUsedSeconds(duration);
        setResult(graded);
        onGraded?.();
        window.scrollTo({ top: 0 });
      } catch {
        setError(t.common.submitRetry);
      }
    });
  }

  /** Start the same exercise over: a fresh attempt with its own request id. */
  function retry() {
    setResult(null);
    setAnswers({});
    setUsedSeconds(null);
    setError(null);
    requestRef.current = null;
    startedAt.current = Date.now();
    window.scrollTo({ top: 0 });
  }

  return {
    answers,
    answer,
    answeredCount,
    result,
    usedSeconds,
    error,
    pending,
    submit,
    retry,
    wrongCount: result ? result.perQuestion.filter((q) => !q.correct).length : 0,
  };
}
