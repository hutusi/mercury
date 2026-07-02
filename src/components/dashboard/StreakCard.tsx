import { Flame } from "lucide-react";
import { getDict } from "@/lib/i18n";

export async function StreakCard({ streak }: { streak: number }) {
  const t = await getDict();
  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{t.dashboard.streak}</p>
          <p className="mt-1 text-3xl font-bold">
            {streak}{" "}
            <span className="text-base font-medium text-muted-foreground">
              {t.dashboard.streakDays}
            </span>
          </p>
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
          aria-hidden
        >
          <Flame className="size-5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground/70">{t.dashboard.streakHint}</p>
    </div>
  );
}
