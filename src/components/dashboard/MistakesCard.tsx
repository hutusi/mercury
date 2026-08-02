import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { Stat } from "@/components/typography/Stat";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n";

export async function MistakesCard({ activeCount }: { activeCount: number }) {
  const t = await getDict();
  return (
    <div className="border-t border-border pt-4">
      {/* Uncleared mistakes take the red pen, like due words above. */}
      <Stat
        label={t.mistakes.dashboardLabel}
        value={activeCount}
        unit={t.mistakes.dashboardUnit}
        accent={activeCount > 0}
      />
      <Button asChild variant="outline" className="mt-3 w-full">
        <Link href="/mistakes">{t.mistakes.open}</Link>
      </Button>
    </div>
  );
}
