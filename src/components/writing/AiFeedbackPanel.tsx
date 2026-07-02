import type { WritingFeedback } from "@/lib/ai/schemas";
import { getDict } from "@/lib/i18n";

export async function AiFeedbackPanel({ feedback }: { feedback: WritingFeedback }) {
  const t = await getDict();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-sm font-medium text-brand-600">{t.writing.overall}</p>
        <p className="mt-1 text-4xl font-bold text-brand-800">{feedback.scoreLabel}</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-700">{feedback.summaryZh}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          {t.writing.criteria}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {feedback.criteria.map((c) => (
            <div key={c.name} className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-slate-900">{c.nameZh}</p>
                <p className="text-lg font-bold text-brand-700">{c.score}</p>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{c.name}</p>
              <p className="mt-2 text-sm text-slate-600">{c.commentZh}</p>
            </div>
          ))}
        </div>
      </section>

      {feedback.strengths.length > 0 && (
        <section className="rounded-xl border border-green-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-green-600 uppercase">
            <span aria-hidden>✅</span> {t.writing.strengths}
          </h2>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-slate-900">{s.en}</span>
                <span className="ml-2 text-slate-500">{s.zh}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {feedback.issues.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-amber-600 uppercase">
            <span aria-hidden>🔧</span> {t.writing.issues}
          </h2>
          <ul className="space-y-4">
            {feedback.issues.map((issue, i) => (
              <li key={i} className="rounded-lg bg-slate-50 p-4 text-sm">
                <p className="text-red-600 line-through decoration-red-300">“{issue.quote}”</p>
                <p className="mt-1.5 text-slate-600">{issue.problemZh}</p>
                <p className="mt-1.5 font-medium text-green-700">
                  {t.writing.suggestion}: {issue.suggestionEn}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {feedback.rewrittenSample && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            {t.writing.rewritten}
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800">
            {feedback.rewrittenSample}
          </p>
        </section>
      )}
    </div>
  );
}
