import { CheckCircle2, Wrench } from "lucide-react";
import type { WritingFeedback } from "@/lib/ai/schemas";
import { getDict } from "@/lib/i18n";

export async function AiFeedbackPanel({ feedback }: { feedback: WritingFeedback }) {
  const t = await getDict();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/10 p-6 text-center">
        <p className="text-sm font-medium text-primary">{t.writing.overall}</p>
        <p className="mt-1 text-4xl font-bold text-primary">{feedback.scoreLabel}</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/80">{feedback.summaryZh}</p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t.writing.criteria}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {feedback.criteria.map((c) => (
            <div key={c.name} className="rounded-lg bg-muted p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">{c.nameZh}</p>
                <p className="text-lg font-bold text-primary">{c.score}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground/70">{c.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">{c.commentZh}</p>
            </div>
          ))}
        </div>
      </section>

      {feedback.strengths.length > 0 && (
        <section className="rounded-xl border border-green-500/20 bg-card p-6 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-green-600 uppercase dark:text-green-400">
            <span aria-hidden>
              <CheckCircle2 className="inline size-4" />
            </span>{" "}
            {t.writing.strengths}
          </h2>
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
        <section className="rounded-xl border border-amber-200 bg-card p-6 shadow-xs dark:border-amber-400/20">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-400">
            <span aria-hidden>
              <Wrench className="inline size-4" />
            </span>{" "}
            {t.writing.issues}
          </h2>
          <ul className="space-y-4">
            {feedback.issues.map((issue, i) => (
              <li key={i} className="rounded-lg bg-muted p-4 text-sm">
                <p className="text-destructive line-through decoration-destructive/40">
                  “{issue.quote}”
                </p>
                <p className="mt-1.5 text-muted-foreground">{issue.problemZh}</p>
                <p className="mt-1.5 font-medium text-green-700 dark:text-green-400">
                  {t.writing.suggestion}: {issue.suggestionEn}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {feedback.rewrittenSample && (
        <section className="rounded-xl border bg-card p-6 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t.writing.rewritten}
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
            {feedback.rewrittenSample}
          </p>
        </section>
      )}
    </div>
  );
}
