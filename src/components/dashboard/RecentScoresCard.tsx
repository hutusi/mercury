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
    <div className="rounded-xl border bg-card p-5 shadow-xs">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {t.dashboard.recentScores}
      </h2>
      {scores.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground/70">{t.dashboard.noScores}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {scores.map((s, i) => (
            <li key={i} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground/70">
                  {s.date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
                </p>
              </div>
              <span className="font-bold text-primary">{s.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
