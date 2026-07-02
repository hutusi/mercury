"use client";

import { MessageCircle } from "lucide-react";
import { SectionLabel } from "@/components/typography/SectionLabel";
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
      <div className="border-y border-border py-6 text-center">
        <SectionLabel as="p">{t.writing.overall}</SectionLabel>
        <p className="mt-2 font-serif text-4xl font-medium">{feedback.scoreLabel}</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/80">{feedback.summaryZh}</p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {criteria.map((c) => (
          <div key={c.label} className="p-4 sm:first:pl-0 sm:last:pr-0">
            <div className="flex items-baseline justify-between">
              <p className="font-medium">{c.label}</p>
              <p className="font-mono text-lg font-semibold tabular-nums">{c.data.score}</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{c.data.commentZh}</p>
          </div>
        ))}
      </div>

      {feedback.suggestions.length > 0 && (
        <section className="border-b border-border pb-6">
          <SectionLabel as="h2" className="mb-3">
            {t.speaking.suggestions}
          </SectionLabel>
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
        <section className="border-b border-border pb-6">
          <SectionLabel as="h2" className="mb-3">
            <span aria-hidden>
              <MessageCircle className="inline size-4" />
            </span>{" "}
            {t.speaking.betterPhrases}
          </SectionLabel>
          <ul className="space-y-4">
            {feedback.betterPhrases.map((p, i) => (
              <li key={i} className="bg-muted p-4 text-sm">
                {/* The red pen strikes the original; the fix stands in ink. */}
                <p className="text-cinnabar line-through decoration-cinnabar/40">“{p.original}”</p>
                <p className="mt-1.5 font-serif font-medium">“{p.improved}”</p>
                <p className="mt-1.5 text-muted-foreground">{p.noteZh}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
