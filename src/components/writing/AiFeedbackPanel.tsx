import { Check, PenLine } from "lucide-react";
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
      <section className="rounded-xl border border-border bg-card p-6 shadow-raised">
        <p className="text-[0.8125rem] text-muted-foreground">{t.writing.yourScore}</p>
        <p className="mt-1 font-serif text-4xl font-medium tabular-nums">{feedback.scoreLabel}</p>
        <p className="mt-3 text-sm leading-[1.75] text-pretty text-soft-3">{feedback.summaryZh}</p>
      </section>

      {feedback.issues.length > 0 ? (
        <section aria-labelledby="writing-issues">
          <h2
            id="writing-issues"
            className="flex items-center gap-2 text-[0.9375rem] font-semibold"
          >
            <PenLine className="size-4 text-coral" aria-hidden />
            {t.writing.issues}
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {feedback.issues.map((issue, i) => (
              <li key={i} className="rounded-lg border border-border bg-card px-4 py-3.5 text-sm">
                <p className="font-serif text-[0.9375rem] text-coral-ink line-through decoration-coral">
                  “{issue.quote}”
                </p>
                <p className="mt-1.5 leading-relaxed text-soft-3">{issue.problemZh}</p>
                <p className="mt-2 leading-relaxed">
                  <span className="text-muted-foreground">{t.writing.suggestion}：</span>
                  <span className="font-medium text-brand-ink">{issue.suggestionEn}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {feedback.strengths.length > 0 ? (
        <section aria-labelledby="writing-strengths">
          <h2 id="writing-strengths" className="text-[0.9375rem] font-semibold">
            {t.writing.strengths}
          </h2>
          <ul className="mt-3 flex flex-col gap-2.5">
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
        </section>
      ) : null}

      <section aria-labelledby="writing-criteria">
        <h2 id="writing-criteria" className="text-[0.9375rem] font-semibold">
          {t.writing.criteria}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
      </section>

      {feedback.rewrittenSample ? (
        <section aria-labelledby="writing-rewritten">
          <h2 id="writing-rewritten" className="text-[0.9375rem] font-semibold">
            {t.writing.rewritten}
          </h2>
          <p className="mt-3 rounded-lg bg-muted px-5 py-4 font-serif text-base leading-[1.75] whitespace-pre-line">
            {feedback.rewrittenSample}
          </p>
        </section>
      ) : null}
    </div>
  );
}
