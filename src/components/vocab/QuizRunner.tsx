"use client";

import { Check, Dumbbell, ThumbsUp, Trophy, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { answerQuiz } from "@/lib/actions/vocab";
import { useFlowCounter, useFlowExit } from "@/lib/flow-store";
import { useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/vocab-quiz-core";

export type { QuizQuestion } from "@/lib/vocab-quiz-core";

export function QuizRunner({
  sessionId,
  questions,
  initialAnsweredIds = [],
}: {
  sessionId: string;
  questions: QuizQuestion[];
  /** Already-answered question ids from a resumed session (page reload). */
  initialAnsweredIds?: string[];
}) {
  const t = useT();
  const router = useRouter();
  // Resume at the first unanswered question — the session survives reloads.
  const [index, setIndex] = useState(() => {
    const answered = new Set(initialAnsweredIds);
    const first = questions.findIndex((q) => !answered.has(q.id));
    return first === -1 ? Math.max(questions.length - 1, 0) : first;
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<{ score: number; total: number } | null>(
    null,
  );
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Conflict recovery: the question already holds a different answer
  // server-side (a lost response, retried with another option). The reveal
  // is unavailable, but the learner must be able to move on.
  const [conflicted, setConflicted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [pending, startTransition] = useTransition();
  const resultRef = useRef<HTMLDivElement>(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  // The session is server-owned: every answer is saved, so leaving is safe.
  useFlowCounter(result || expired || !question ? null : `${index + 1} / ${questions.length}`);
  useFlowExit("saved", !result && index > 0);

  function pick(optionId: string) {
    if (picked || conflicted || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const graded = await answerQuiz({
          sessionId,
          questionId: question.id,
          optionId,
        });
        if (!graded.ok) {
          if (graded.reason === "expired") {
            setExpired(true);
            return;
          }
          setConflicted(true);
          setError(t.vocab.answerConflict);
          return;
        }
        setPicked(optionId);
        setCorrectOptionId(graded.correctOptionId);
        if (graded.completed && graded.score !== undefined && graded.total !== undefined) {
          setCompletedResult({ score: graded.score, total: graded.total });
        }
      } catch {
        setError(t.common.submitRetry);
      }
    });
  }

  function next() {
    if (!picked && !conflicted) return;
    if (isLast) {
      // No local score means the session completed on a lost response —
      // refresh to a fresh quiz rather than leaving a dead Finish button.
      if (completedResult) {
        setResult(completedResult);
        requestAnimationFrame(() => resultRef.current?.focus());
      } else router.refresh();
    } else {
      setPicked(null);
      setCorrectOptionId(null);
      setConflicted(false);
      setError(null);
      setIndex((i) => i + 1);
    }
  }

  if (expired) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <Callout variant="error" className="w-full p-4 text-sm">
          {t.vocab.quizExpired}
        </Callout>
        <Button onClick={() => router.refresh()} size="lg">
          {t.vocab.quizRestart}
        </Button>
      </div>
    );
  }

  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    const TierIcon = pct >= 80 ? Trophy : pct >= 60 ? ThumbsUp : Dumbbell;
    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        className="mx-auto flex max-w-[35rem] flex-col items-center text-center outline-hidden"
      >
        <span className="flex size-[4.5rem] items-center justify-center rounded-full bg-brand-soft text-brand">
          <TierIcon className="size-8" aria-hidden />
        </span>
        <h2 className="mt-6 font-serif text-[1.75rem] leading-tight font-medium sm:text-4xl">
          {t.vocab.quizDone}
        </h2>
        <p className="mt-3 font-serif text-5xl font-medium tabular-nums">
          {result.score} / {result.total}
        </p>
        <div className="mt-8 flex w-full flex-col gap-2.5">
          {result.score < result.total ? (
            <Button asChild size="lg">
              <Link href="/mistakes">
                {t.common.reviewWrongCta} · {result.total - result.score}
              </Link>
            </Button>
          ) : null}
          <Button asChild size="lg" variant={result.score < result.total ? "outline" : "default"}>
            <Link href="/vocabulary/study">{t.vocab.startStudy}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/vocabulary">{t.vocab.backToVocab}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto flex max-w-[37.5rem] flex-col gap-4">
      <p className="text-sm font-semibold">
        {question.direction === "en2zh" ? t.vocab.quizPickMeaning : t.vocab.quizPickWord}
      </p>

      <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-raised">
        <h2
          id="vocab-quiz-prompt"
          className="font-serif text-[2.25rem] leading-tight font-medium break-words sm:text-5xl"
        >
          {question.prompt}
        </h2>
      </div>

      <div className="flex flex-col gap-2" role="group" aria-labelledby="vocab-quiz-prompt">
        {question.options.map((option, i) => {
          const isCorrect = option.id === correctOptionId;
          const isPicked = picked === option.id;
          // Correct is dusk blue with a check; the wrong pick is coral with a
          // cross and a strike — shape carries the meaning, not colour alone.
          const tone = !picked
            ? "border-border bg-card hover:border-input hover:bg-muted"
            : isCorrect
              ? "border-brand bg-brand-soft"
              : isPicked
                ? "border-coral bg-coral-soft text-muted-foreground"
                : "border-border bg-card text-muted-foreground";
          return (
            <button
              key={option.id}
              type="button"
              data-quiz-option
              onClick={() => pick(option.id)}
              disabled={!!picked || conflicted || pending}
              aria-pressed={isPicked}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-lg border-[1.5px] px-3 py-2 text-left text-[0.9375rem] leading-snug outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                tone,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  picked && isCorrect
                    ? "bg-brand text-brand-foreground"
                    : picked && isPicked
                      ? "bg-coral text-coral-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {"ABCD"[i]}
              </span>
              <span className={cn("flex-1", picked && isPicked && !isCorrect && "line-through")}>
                {option.text}
              </span>
              {picked && isCorrect ? (
                <Check className="size-[1.125rem] text-brand" aria-hidden />
              ) : null}
              {picked && isPicked && !isCorrect ? (
                <X className="size-[1.125rem] text-coral" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <Callout variant="error" className="p-3 text-center text-sm">
          {error}
        </Callout>
      ) : null}

      {picked || conflicted ? (
        <Button onClick={next} disabled={pending} size="lg" className="w-full">
          {pending ? t.common.loading : isLast ? t.common.finish : t.common.next}
        </Button>
      ) : null}
    </div>
  );
}
