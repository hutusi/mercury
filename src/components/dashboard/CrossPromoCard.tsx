import { ArrowRight, Briefcase, Timer } from "lucide-react";
import type { Track } from "@/content/types";
import { getCrossPromo } from "@/lib/crosspromo";
import { getDict } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

/** A quiet pointer to the other track, under a result — never louder than the next step. */
export async function CrossPromoCard({ track }: { track: Track }) {
  const t = await getDict();
  const promo = getCrossPromo(track);
  const isToExam = promo.direction === "businessToExam";
  const Icon = isToExam ? Timer : Briefcase;

  return (
    <aside className="flex items-start gap-3.5 rounded-xl border border-border bg-card p-[1.125rem]">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-soft-2"
      >
        <Icon className="size-[1.125rem]" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[0.9375rem] font-semibold">
          {isToExam ? t.crosspromo.businessToExamTitle : t.crosspromo.examToBusinessTitle}
        </h3>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
          {isToExam ? t.crosspromo.businessToExamDesc : t.crosspromo.examToBusinessDesc}
        </p>
        <Link
          href={promo.href}
          className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-sm text-[0.8125rem] font-medium text-brand-ink outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.crosspromo.cta}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
