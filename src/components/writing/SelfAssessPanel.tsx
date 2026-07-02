import type { Bilingual } from "@/content/types";
import { getDict } from "@/lib/i18n";

export async function SelfAssessPanel({
  modelAnswer,
  checklist,
}: {
  modelAnswer: string;
  checklist: Bilingual[];
}) {
  const t = await getDict();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        <p className="font-semibold">{t.writing.selfAssessTitle}</p>
        <p className="mt-1">{t.writing.selfAssessHint}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          {t.writing.checklist}
        </h2>
        <ul className="space-y-3">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                id={`check-${i}`}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              <label htmlFor={`check-${i}`} className="cursor-pointer">
                <span className="font-medium text-slate-900">{item.zh}</span>
                <span className="block text-slate-500">{item.en}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          {t.writing.modelAnswer}
        </h2>
        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800">{modelAnswer}</p>
      </section>
    </div>
  );
}
