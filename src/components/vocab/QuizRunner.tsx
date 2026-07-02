"use client";

import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useState, useTransition } from "react";
import type { Track } from "@/content/types";
import { submitQuiz } from "@/lib/actions/vocab";
import { useT } from "@/lib/i18n/LocaleProvider";

export interface QuizQuestion {
  wordId: string;
  direction: "en2zh" | "zh2en";
  prompt: string;
  options: { wordId: string; text: string }[];
}

export function QuizRunner({ track, questions }: { track: Track; questions: QuizQuestion[] }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const question = questions[index];
  const isLast = index === questions.length - 1;

  function pick(optionWordId: string) {
    if (picked) return;
    setPicked(optionWordId);
    setAnswers((a) => ({ ...a, [question.wordId]: optionWordId }));
  }

  function next() {
    if (!picked) return;
    if (isLast) {
      const finalAnswers = { ...answers };
      startTransition(async () => {
        const r = await submitQuiz({ track, answers: finalAnswers });
        setResult(r);
      });
    } else {
      setPicked(null);
      setIndex((i) => i + 1);
    }
  }

  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-card p-10 text-center shadow-xs">
        <p className="text-4xl" aria-hidden>
          {pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "💪"}
        </p>
        <h2 className="mt-4 text-xl font-bold">{t.vocab.quizDone}</h2>
        <p className="mt-2 text-3xl font-bold text-primary">
          {result.score} / {result.total}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/vocabulary"
            className="rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-muted"
          >
            {t.common.back}
          </Link>
          <Link
            href="/vocabulary/study"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/80"
          >
            {t.vocab.startStudy}
          </Link>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {index + 1} / {questions.length}
        </span>
        <span>
          {question.direction === "en2zh" ? t.vocab.quizPickMeaning : t.vocab.quizPickWord}
        </span>
      </div>

      <div className="rounded-2xl border bg-card p-8 text-center shadow-xs">
        <p className="text-3xl font-bold">{question.prompt}</p>
      </div>

      <div className="space-y-2">
        {question.options.map((option) => {
          const isCorrect = option.wordId === question.wordId;
          const isPicked = picked === option.wordId;
          let cls = "border-border bg-card text-foreground/80 hover:border-primary/50";
          if (picked) {
            if (isCorrect)
              cls =
                "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400 font-semibold";
            else if (isPicked) cls = "border-destructive/40 bg-destructive/10 text-destructive";
            else cls = "border-border bg-card text-muted-foreground/70";
          }
          return (
            <button
              key={option.wordId}
              onClick={() => pick(option.wordId)}
              disabled={!!picked}
              className={`w-full rounded-lg border px-4 py-3 text-left transition ${cls}`}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {picked && (
        <button
          onClick={next}
          disabled={pending}
          className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:opacity-50"
        >
          {pending ? t.common.loading : isLast ? t.common.finish : t.common.next}
        </button>
      )}
    </div>
  );
}
