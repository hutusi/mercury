import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { Stat } from "@/components/typography/Stat";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n";

export async function DueWordsCard({ dueCount }: { dueCount: number }) {
  const t = await getDict();
  return (
    <div className="border-t border-border pt-4">
      {/* Due words feed the review funnel — the one accented figure in the margin. */}
      <Stat
        label={t.dashboard.dueWords}
        value={dueCount}
        unit={t.dashboard.dueWordsUnit}
        accent={dueCount > 0}
      />
      <Button asChild variant={dueCount > 0 ? "default" : "outline"} className="mt-3 w-full">
        <Link href="/vocabulary/study">
          {dueCount > 0 ? t.dashboard.reviewNow : t.dashboard.learnNew}
        </Link>
      </Button>
    </div>
  );
}
