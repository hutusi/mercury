import { Briefcase, Timer } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { Track } from "@/content/types";
import { getCrossPromo } from "@/lib/crosspromo";
import { getDict } from "@/lib/i18n";

export async function CrossPromoCard({ track }: { track: Track }) {
  const t = await getDict();
  const promo = getCrossPromo(track);
  const isToExam = promo.direction === "businessToExam";
  const Icon = isToExam ? Timer : Briefcase;

  return (
    <Callout variant="accent" className="p-4">
      <h3 className="flex items-center gap-2 font-serif font-medium">
        <Icon className="size-4 text-cinnabar" aria-hidden />
        {isToExam ? t.crosspromo.businessToExamTitle : t.crosspromo.examToBusinessTitle}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {isToExam ? t.crosspromo.businessToExamDesc : t.crosspromo.examToBusinessDesc}
      </p>
      <Button asChild variant="accent" size="sm" className="mt-3">
        <Link href={promo.href}>{t.crosspromo.cta} →</Link>
      </Button>
    </Callout>
  );
}
