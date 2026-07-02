import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { getDict } from "@/lib/i18n";

export async function DueWordsCard({ dueCount }: { dueCount: number }) {
  const t = await getDict();
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-500">{t.dashboard.dueWords}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          <span aria-hidden>📚</span> {dueCount}{" "}
          <span className="text-base font-medium text-slate-500">{t.dashboard.dueWordsUnit}</span>
        </p>
      </div>
      <Link
        href="/vocabulary/study"
        className={`mt-3 inline-block rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
          dueCount > 0
            ? "bg-brand-600 text-white hover:bg-brand-700"
            : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        {dueCount > 0 ? t.dashboard.reviewNow : t.dashboard.learnNew}
      </Link>
    </div>
  );
}
