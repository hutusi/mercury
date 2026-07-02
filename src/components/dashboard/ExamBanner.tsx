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
    <div className="flex flex-col justify-between rounded-xl border-2 border-accent-300 bg-gradient-to-br from-accent-50 to-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-accent-700">
          <span aria-hidden>⏱️</span> {t.dashboard.examBanner}
        </p>
        <p className="mt-1 text-xs text-slate-500">{t.dashboard.examBannerDesc}</p>
        {estimateText && (
          <p className="mt-2 text-lg font-bold text-slate-900">
            {t.dashboard.lastEstimate}: {estimateText}
          </p>
        )}
      </div>
      <Link
        href={resumeExamId ? `/exams/${resumeExamId}/take` : "/exams"}
        className="mt-3 inline-block rounded-lg bg-accent-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-accent-600"
      >
        {resumeExamId ? t.exams.resumeExam : t.dashboard.startExam}
      </Link>
    </div>
  );
}
