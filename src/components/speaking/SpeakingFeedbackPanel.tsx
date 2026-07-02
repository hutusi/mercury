"use client";

import type { SpeakingFeedback } from "@/lib/ai/schemas";
import { useT } from "@/lib/i18n/LocaleProvider";

export function SpeakingFeedbackPanel({ feedback }: { feedback: SpeakingFeedback }) {
  const t = useT();

  const criteria = [
    { label: t.speaking.fluency, data: feedback.fluency },
    { label: t.speaking.vocabulary, data: feedback.vocabulary },
    { label: t.speaking.grammar, data: feedback.grammar },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-sm font-medium text-brand-600">{t.writing.overall}</p>
        <p className="mt-1 text-4xl font-bold text-brand-800">{feedback.scoreLabel}</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-700">{feedback.summaryZh}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {criteria.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold text-slate-900">{c.label}</p>
              <p className="text-lg font-bold text-brand-700">{c.data.score}</p>
            </div>
            <p className="mt-2 text-sm text-slate-600">{c.data.commentZh}</p>
          </div>
        ))}
      </div>

      {feedback.suggestions.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            {t.speaking.suggestions}
          </h2>
          <ul className="space-y-2">
            {feedback.suggestions.map((s, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-slate-900">{s.en}</span>
                <span className="ml-2 text-slate-500">{s.zh}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {feedback.betterPhrases.length > 0 && (
        <section className="rounded-xl border border-green-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-green-600 uppercase">
            <span aria-hidden>💬</span> {t.speaking.betterPhrases}
          </h2>
          <ul className="space-y-4">
            {feedback.betterPhrases.map((p, i) => (
              <li key={i} className="rounded-lg bg-slate-50 p-4 text-sm">
                <p className="text-red-600 line-through decoration-red-300">“{p.original}”</p>
                <p className="mt-1.5 font-medium text-green-700">“{p.improved}”</p>
                <p className="mt-1.5 text-slate-600">{p.noteZh}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
