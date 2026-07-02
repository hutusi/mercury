import { getDict, getLocale } from "@/lib/i18n";

export interface RecentScore {
  date: Date;
  label: string;
  detail: string;
}

export async function RecentScoresCard({ scores }: { scores: RecentScore[] }) {
  const t = await getDict();
  const locale = await getLocale();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
        {t.dashboard.recentScores}
      </h2>
      {scores.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{t.dashboard.noScores}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {scores.map((s, i) => (
            <li key={i} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-medium text-slate-800">{s.label}</p>
                <p className="text-xs text-slate-400">
                  {s.date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
                </p>
              </div>
              <span className="font-bold text-brand-700">{s.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
