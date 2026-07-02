import { Timer } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { ExamEstimate } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";

export async function ExamBanner({
  lastEstimate,
  resumeExamId,
}: {
  lastEstimate: ExamEstimate | null;
  resumeExamId: string | null;
}) {
  const t = await getDict();

  const estimateText =
    lastEstimate?.kind === "toeic"
      ? `TOEIC ${lastEstimate.total}`
      : lastEstimate?.kind === "ielts"
        ? `IELTS ${lastEstimate.band.toFixed(1)}`
        : null;

  return (
    <div className="flex flex-col justify-between rounded-xl border-2 border-amber-300 bg-linear-to-br from-amber-500/10 to-transparent p-5 shadow-xs dark:border-amber-400/30">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
          <Timer className="size-4" aria-hidden />
          {t.dashboard.examBanner}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t.dashboard.examBannerDesc}</p>
        {estimateText && (
          <p className="mt-2 text-lg font-bold">
            {t.dashboard.lastEstimate}: {estimateText}
          </p>
        )}
      </div>
      <Link
        href={resumeExamId ? `/exams/${resumeExamId}/take` : "/exams"}
        className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-amber-600"
      >
        {resumeExamId ? t.exams.resumeExam : t.dashboard.startExam}
      </Link>
    </div>
  );
}
