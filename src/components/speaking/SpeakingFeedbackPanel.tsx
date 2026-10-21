"use client";

import { Check, MessageCircle } from "lucide-react";
import { FeedbackSection, FixCard, ScoreHero } from "@/components/feedback/FeedbackParts";
import type { SpeakingFeedback } from "@/lib/ai/schemas";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * AI speaking feedback: the score, more natural ways to say what the learner
 * said (their phrase struck in coral, the better one in dusk blue), next
 * steps, and the three sub-scores.
 */
export function SpeakingFeedbackPanel({ feedback }: { feedback: SpeakingFeedback }) {
  const t = useT();

  const criteria = [
    { label: t.speaking.fluency, data: feedback.fluency },
    { label: t.speaking.vocabulary, data: feedback.vocabulary },
    { label: t.speaking.grammar, data: feedback.grammar },
  ];

  return (
    <div className="flex flex-col gap-8">
      <ScoreHero
        label={t.speaking.yourScore}
        score={feedback.scoreLabel}
        summary={feedback.summaryZh}
      />

      {feedback.betterPhrases.length > 0 ? (
        <FeedbackSection
          id="speak-phrases"
          title={t.speaking.betterPhrases}
          icon={<MessageCircle className="size-4 text-coral" aria-hidden />}
        >
          <ul className="flex flex-col gap-3">
            {feedback.betterPhrases.map((p, i) => (
              <FixCard
                key={i}
                original={p.original}
                note={p.noteZh}
                improved={<span className="font-serif text-[0.9375rem]">“{p.improved}”</span>}
              />
            ))}
          </ul>
        </FeedbackSection>
      ) : null}

      {feedback.suggestions.length > 0 ? (
        <FeedbackSection id="speak-suggestions" title={t.speaking.suggestions}>
          <ul className="flex flex-col gap-2.5">
            {feedback.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="font-medium">{s.en}</span>
                  <span className="ml-2 text-muted-foreground">{s.zh}</span>
                </span>
              </li>
            ))}
          </ul>
        </FeedbackSection>
      ) : null}

      <FeedbackSection id="speak-criteria" title={t.writing.criteria}>
        <div className="grid gap-3 sm:grid-cols-3">
          {criteria.map((c) => (
            <div key={c.label} className="rounded-lg bg-muted px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold">{c.label}</p>
                <p className="font-serif text-xl font-medium tabular-nums">{c.data.score}</p>
              </div>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-soft-3">
                {c.data.commentZh}
              </p>
            </div>
          ))}
        </div>
      </FeedbackSection>
    </div>
  );
}
