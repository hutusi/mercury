import { CheckCircle2, Wrench } from "lucide-react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import type { WritingFeedback } from "@/lib/ai/schemas";
import { getDict } from "@/lib/i18n";

export async function AiFeedbackPanel({ feedback }: { feedback: WritingFeedback }) {
  const t = await getDict();

  return (
    <div className="space-y-6">
      <div className="border-y border-border py-6 text-center">
        <SectionLabel as="p">{t.writing.overall}</SectionLabel>
        <p className="mt-2 font-serif text-4xl font-medium">{feedback.scoreLabel}</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/80">{feedback.summaryZh}</p>
      </div>

      <section className="border-b border-border pb-6">
        <SectionLabel as="h2" className="mb-4">
          {t.writing.criteria}
        </SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          {feedback.criteria.map((c) => (
            <div key={c.name} className="bg-muted p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-medium">{c.nameZh}</p>
                <p className="font-mono text-lg font-semibold tabular-nums">{c.score}</p>
              </div>
              <p className="mt-0.5 font-mono text-2xs text-muted-foreground/70 uppercase">
                {c.name}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{c.commentZh}</p>
            </div>
          ))}
        </div>
      </section>

      {feedback.strengths.length > 0 && (
        <section className="border-b border-border pb-6">
          <SectionLabel as="h2" className="mb-3">
            <span aria-hidden>
              <CheckCircle2 className="inline size-4" />
            </span>{" "}
            {t.writing.strengths}
          </SectionLabel>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{s.en}</span>
                <span className="ml-2 text-muted-foreground">{s.zh}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {feedback.issues.length > 0 && (
        <section className="border-b border-border pb-6">
          <SectionLabel as="h2" className="mb-3 text-cinnabar">
            <span aria-hidden>
              <Wrench className="inline size-4" />
            </span>{" "}
            {t.writing.issues}
          </SectionLabel>
          <ul className="space-y-4">
            {feedback.issues.map((issue, i) => (
              <li key={i} className="bg-muted p-4 text-sm">
                {/* Red pen on the quote; the suggestion stands in ink. */}
                <p className="text-cinnabar line-through decoration-cinnabar/40">“{issue.quote}”</p>
                <p className="mt-1.5 text-muted-foreground">{issue.problemZh}</p>
                <p className="mt-1.5 font-medium">
                  {t.writing.suggestion}: {issue.suggestionEn}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {feedback.rewrittenSample && (
        <section className="border-b border-border pb-6">
          <SectionLabel as="h2" className="mb-3">
            {t.writing.rewritten}
          </SectionLabel>
          <p className="font-serif text-sm leading-relaxed whitespace-pre-line text-foreground/80">
            {feedback.rewrittenSample}
          </p>
        </section>
      )}
    </div>
  );
}
