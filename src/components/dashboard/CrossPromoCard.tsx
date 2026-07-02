import { Briefcase, Timer } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { Track } from "@/content/types";
import { getCrossPromo } from "@/lib/crosspromo";
import { getDict } from "@/lib/i18n";

export async function CrossPromoCard({ track }: { track: Track }) {
  const t = await getDict();
  const promo = getCrossPromo(track);
  const isToExam = promo.direction === "businessToExam";
  const Icon = isToExam ? Timer : Briefcase;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Icon className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
            {isToExam ? t.crosspromo.businessToExamTitle : t.crosspromo.examToBusinessTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isToExam ? t.crosspromo.businessToExamDesc : t.crosspromo.examToBusinessDesc}
          </p>
        </div>
        <Link
          href={promo.href}
          className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          {t.crosspromo.cta} →
        </Link>
      </div>
    </div>
  );
}
