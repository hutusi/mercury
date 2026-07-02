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
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-4xl" aria-hidden>
          {pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "💪"}
        </p>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{t.vocab.quizDone}</h2>
        <p className="mt-2 text-3xl font-bold text-brand-700">
          {result.score} / {result.total}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/vocabulary"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t.common.back}
          </Link>
          <Link
            href="/vocabulary/study"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
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
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {index + 1} / {questions.length}
        </span>
        <span>
          {question.direction === "en2zh" ? t.vocab.quizPickMeaning : t.vocab.quizPickWord}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-3xl font-bold text-slate-900">{question.prompt}</p>
      </div>

      <div className="space-y-2">
        {question.options.map((option) => {
          const isCorrect = option.wordId === question.wordId;
          const isPicked = picked === option.wordId;
          let cls = "border-slate-200 bg-white text-slate-700 hover:border-brand-300";
          if (picked) {
            if (isCorrect) cls = "border-green-500 bg-green-50 text-green-800 font-semibold";
            else if (isPicked) cls = "border-red-400 bg-red-50 text-red-700";
            else cls = "border-slate-200 bg-white text-slate-400";
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
          className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? t.common.loading : isLast ? t.common.finish : t.common.next}
        </button>
      )}
    </div>
  );
}
