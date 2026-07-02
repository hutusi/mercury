import { SectionLabel } from "@/components/typography/SectionLabel";
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
    <section>
      <SectionLabel as="h2">{t.dashboard.recentScores}</SectionLabel>
      {scores.length === 0 ? (
        <p className="mt-3 border-t border-border pt-4 text-sm text-muted-foreground">
          {t.dashboard.noScores}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {scores.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-medium">{s.label}</p>
                <p className="mt-0.5 font-mono text-2xs text-muted-foreground">
                  {s.date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
                </p>
              </div>
              <span className="font-mono font-semibold tabular-nums">{s.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
