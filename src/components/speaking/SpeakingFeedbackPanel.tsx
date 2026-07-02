"use client";

import { MessageCircle } from "lucide-react";
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
      <div className="rounded-xl border border-primary/20 bg-primary/10 p-6 text-center">
        <p className="text-sm font-medium text-primary">{t.writing.overall}</p>
        <p className="mt-1 text-4xl font-bold text-primary">{feedback.scoreLabel}</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/80">{feedback.summaryZh}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {criteria.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold">{c.label}</p>
              <p className="text-lg font-bold text-primary">{c.data.score}</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{c.data.commentZh}</p>
          </div>
        ))}
      </div>

      {feedback.suggestions.length > 0 && (
        <section className="rounded-xl border bg-card p-6 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t.speaking.suggestions}
          </h2>
          <ul className="space-y-2">
            {feedback.suggestions.map((s, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{s.en}</span>
                <span className="ml-2 text-muted-foreground">{s.zh}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {feedback.betterPhrases.length > 0 && (
        <section className="rounded-xl border border-green-500/20 bg-card p-6 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-green-600 uppercase dark:text-green-400">
            <span aria-hidden>
              <MessageCircle className="inline size-4" />
            </span>{" "}
            {t.speaking.betterPhrases}
          </h2>
          <ul className="space-y-4">
            {feedback.betterPhrases.map((p, i) => (
              <li key={i} className="rounded-lg bg-muted p-4 text-sm">
                <p className="text-destructive line-through decoration-destructive/40">
                  “{p.original}”
                </p>
                <p className="mt-1.5 font-medium text-green-700 dark:text-green-400">
                  “{p.improved}”
                </p>
                <p className="mt-1.5 text-muted-foreground">{p.noteZh}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
