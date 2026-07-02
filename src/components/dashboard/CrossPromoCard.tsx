import Link from "next/link";
import type { Track } from "@/content/types";
import { getCrossPromo } from "@/lib/crosspromo";
import { getDict } from "@/lib/i18n";

export async function CrossPromoCard({ track }: { track: Track }) {
  const t = await getDict();
  const promo = getCrossPromo(track);
  const isToExam = promo.direction === "businessToExam";

  return (
    <div className="rounded-xl border border-accent-200 bg-accent-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">
            <span aria-hidden>{isToExam ? "⏱️" : "💼"}</span>{" "}
            {isToExam ? t.crosspromo.businessToExamTitle : t.crosspromo.examToBusinessTitle}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {isToExam ? t.crosspromo.businessToExamDesc : t.crosspromo.examToBusinessDesc}
          </p>
        </div>
        <Link
          href={promo.href}
          className="shrink-0 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          {t.crosspromo.cta} →
        </Link>
      </div>
    </div>
  );
}
