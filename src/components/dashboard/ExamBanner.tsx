import { Timer } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
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
    // The exam funnel is the page's cinnabar moment.
    <div className="border border-cinnabar/40 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel as="p" className="flex items-center gap-1.5 text-cinnabar">
            <Timer className="size-3.5" aria-hidden />
            {t.dashboard.examBanner}
          </SectionLabel>
          <p className="mt-2 text-sm text-muted-foreground">{t.dashboard.examBannerDesc}</p>
          {estimateText && (
            <p className="mt-3 text-sm text-muted-foreground">
              {t.dashboard.lastEstimate}:{" "}
              <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">
                {estimateText}
              </span>
            </p>
          )}
        </div>
        <Button asChild variant="accent">
          <Link href={resumeExamId ? `/exams/${resumeExamId}/take` : "/exams"}>
            {resumeExamId ? t.exams.resumeExam : t.dashboard.startExam}
          </Link>
        </Button>
      </div>
    </div>
  );
}
