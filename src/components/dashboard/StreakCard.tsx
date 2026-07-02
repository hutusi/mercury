import { getDict } from "@/lib/i18n";

export async function StreakCard({ streak }: { streak: number }) {
  const t = await getDict();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{t.dashboard.streak}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">
        <span aria-hidden>🔥</span> {streak}{" "}
        <span className="text-base font-medium text-slate-500">{t.dashboard.streakDays}</span>
      </p>
      <p className="mt-2 text-xs text-slate-400">{t.dashboard.streakHint}</p>
    </div>
  );
}
