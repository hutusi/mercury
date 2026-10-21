import { Check, PenLine } from "lucide-react";
import { FeedbackSection, FixCard, ScoreHero } from "@/components/feedback/FeedbackParts";
import type { WritingFeedback } from "@/lib/ai/schemas";
import { getDict } from "@/lib/i18n";

/**
 * AI writing feedback, most useful first: the score and what it means, the
 * fixes (the learner's phrase struck in coral — it is a mistake — with the
 * better wording in dusk blue), what went well, the rubric, and a rewrite.
 */
export async function AiFeedbackPanel({ feedback }: { feedback: WritingFeedback }) {
  const t = await getDict();

  return (
    <div className="flex flex-col gap-8">
      <ScoreHero
        label={t.writing.yourScore}
        score={feedback.scoreLabel}
        summary={feedback.summaryZh}
      />

      {feedback.issues.length > 0 ? (
        <FeedbackSection
          id="writing-issues"
          title={t.writing.issues}
          icon={<PenLine className="size-4 text-coral" aria-hidden />}
        >
          <ul className="flex flex-col gap-3">
            {feedback.issues.map((issue, i) => (
              <FixCard
                key={i}
                original={issue.quote}
                note={issue.problemZh}
                improved={
                  <>
                    <span className="font-normal text-muted-foreground">
                      {t.writing.suggestion}：
                    </span>
                    {issue.suggestionEn}
                  </>
                }
              />
            ))}
          </ul>
        </FeedbackSection>
      ) : null}

      {feedback.strengths.length > 0 ? (
        <FeedbackSection id="writing-strengths" title={t.writing.strengths}>
          <ul className="flex flex-col gap-2.5">
            {feedback.strengths.map((s, i) => (
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

      <FeedbackSection id="writing-criteria" title={t.writing.criteria}>
        <div className="grid gap-3 sm:grid-cols-2">
          {feedback.criteria.map((c) => (
            <div key={c.name} className="rounded-lg bg-muted px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold">{c.nameZh}</p>
                <p className="font-serif text-xl font-medium tabular-nums">{c.score}</p>
              </div>
              <p className="text-xs text-muted-foreground">{c.name}</p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-soft-3">{c.commentZh}</p>
            </div>
          ))}
        </div>
      </FeedbackSection>

      {feedback.rewrittenSample ? (
        <FeedbackSection id="writing-rewritten" title={t.writing.rewritten}>
          <p className="rounded-lg bg-muted px-5 py-4 font-serif text-base leading-[1.75] whitespace-pre-line">
            {feedback.rewrittenSample}
          </p>
        </FeedbackSection>
      ) : null}
    </div>
  );
}
