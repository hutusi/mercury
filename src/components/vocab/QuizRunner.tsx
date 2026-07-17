"use client";

import { Check, Dumbbell, ThumbsUp, Trophy, X } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useState, useTransition } from "react";
import { Stat } from "@/components/typography/Stat";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { answerQuiz } from "@/lib/actions/vocab";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { QuizQuestion } from "@/lib/vocab-quiz-core";

export type { QuizQuestion } from "@/lib/vocab-quiz-core";

export function QuizRunner({
  sessionId,
  questions,
}: {
  sessionId: string;
  questions: QuizQuestion[];
}) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<{ score: number; total: number } | null>(
    null,
  );
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const question = questions[index];
  const isLast = index === questions.length - 1;

  function pick(optionId: string) {
    if (picked || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const graded = await answerQuiz({
          sessionId,
          questionId: question.id,
          optionId,
        });
        setPicked(optionId);
        setCorrectOptionId(graded.correctOptionId);
        if (graded.completed && graded.score !== undefined && graded.total !== undefined) {
          setCompletedResult({ score: graded.score, total: graded.total });
        }
      } catch {
        setError(t.exams.submitFailed);
      }
    });
  }

  function next() {
    if (!picked) return;
    if (isLast) {
      if (completedResult) setResult(completedResult);
    } else {
      setPicked(null);
      setCorrectOptionId(null);
      setIndex((i) => i + 1);
    }
  }

  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    const TierIcon = pct >= 80 ? Trophy : pct >= 60 ? ThumbsUp : Dumbbell;
    return (
      <div className="mx-auto max-w-md border border-border p-10 text-center">
        <p className="flex justify-center" aria-hidden>
          <TierIcon className="size-6" />
        </p>
        <h2 className="mt-4 font-serif text-2xl font-medium">{t.vocab.quizDone}</h2>
        <Stat value={`${result.score} / ${result.total}`} align="center" className="mt-2" />
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/vocabulary">{t.common.back}</Link>
          </Button>
          <Button asChild>
            <Link href="/vocabulary/study">{t.vocab.startStudy}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-mono tabular-nums">
          {index + 1} / {questions.length}
        </span>
        <span>
          {question.direction === "en2zh" ? t.vocab.quizPickMeaning : t.vocab.quizPickWord}
        </span>
      </div>

      <div className="border border-border p-8 text-center">
        <h2 id="vocab-quiz-prompt" className="font-serif text-3xl font-medium tracking-tight">
          {question.prompt}
        </h2>
      </div>

      <div className="space-y-2" role="group" aria-labelledby="vocab-quiz-prompt">
        {question.options.map((option) => {
          const isCorrect = option.id === correctOptionId;
          const isPicked = picked === option.id;
          // Graded like a marked paper: correct answers get an ink check, the
          // wrong pick gets the red pen — icons carry the meaning, not color.
          let cls = "border-border text-foreground/80 hover:border-input hover:bg-muted/50";
          if (picked) {
            if (isCorrect) cls = "border-foreground bg-muted font-medium text-foreground";
            else if (isPicked) cls = "border-cinnabar bg-cinnabar/10 text-cinnabar";
            else cls = "border-border text-muted-foreground/70";
          }
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => pick(option.id)}
              disabled={!!picked || pending}
              aria-pressed={isPicked}
              className={`flex w-full items-center gap-2 border px-4 py-3 text-left outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${cls}`}
            >
              {picked && isCorrect && <Check className="size-4 shrink-0" aria-hidden />}
              {picked && isPicked && !isCorrect && <X className="size-4 shrink-0" aria-hidden />}
              {option.text}
            </button>
          );
        })}
      </div>

      {error && (
        <Callout variant="error" className="p-3 text-center text-sm">
          {error}
        </Callout>
      )}

      {picked && (
        <Button onClick={next} disabled={pending} size="lg" className="h-11 w-full">
          {pending ? t.common.loading : isLast ? t.common.finish : t.common.next}
        </Button>
      )}
    </div>
  );
}
