import { Flame } from "lucide-react";
import { Stat } from "@/components/typography/Stat";
import { getDict } from "@/lib/i18n";

export async function StreakCard({ streak }: { streak: number }) {
  const t = await getDict();
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-start justify-between gap-3">
        <Stat label={t.dashboard.streak} value={streak} unit={t.dashboard.streakDays} />
        <Flame className="mt-6 size-4 shrink-0 text-cinnabar" aria-hidden />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t.dashboard.streakHint}</p>
    </div>
  );
}
