import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { AnswerReview } from "@/components/exam/AnswerReview";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Stat } from "@/components/typography/Stat";
import { requireUser } from "@/lib/auth/session";
import { getDict, localeRedirect } from "@/lib/i18n";
import { getAttemptWithExam } from "@/lib/queries/exams";

export default async function ExamReportPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  const t = await getDict();

  const data = await getAttemptWithExam(user.id, attemptId);
  if (!data) notFound();
  const { attempt, exam } = data;
  if (attempt.status === "in_progress") return localeRedirect(`/exams/${attempt.examId}/take`);

  const estimate = attempt.estimate;
  const sectionScores = attempt.sectionScores ?? [];
  const sectionTitleById = new Map(exam.sections.map((s) => [s.id, s.titleZh]));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/exams"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.exams}
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">
          {t.exams.reportTitle}
        </h1>
        <p className="text-muted-foreground">{exam.titleZh}</p>
      </div>

      {/* Estimate hero — the graded result, ruled in cinnabar */}
      <div className="border-y border-cinnabar/40 py-10 text-center">
        {estimate?.kind === "toeic" ? (
          <>
            <SectionLabel as="p" className="text-cinnabar">
              {t.exams.totalEstimate}
            </SectionLabel>
            <Stat value={estimate.total} size="xl" align="center" className="mt-3" />
            <div className="mt-5 flex justify-center gap-8 font-mono text-sm tabular-nums">
              <span>
                {t.exams.listeningSection}: <strong>{estimate.listening}</strong> / 495
              </span>
              <span>
                {t.exams.readingSection}: <strong>{estimate.reading}</strong> / 495
              </span>
            </div>
          </>
        ) : estimate?.kind === "ielts" ? (
          <>
            <SectionLabel as="p" className="text-cinnabar">
              {t.exams.bandEstimate}
            </SectionLabel>
            <Stat value={estimate.band.toFixed(1)} size="xl" align="center" className="mt-3" />
          </>
        ) : null}
        <p className="mt-5 text-xs text-muted-foreground/70">{t.common.estimateNote}</p>
      </div>

      {/* Section breakdown */}
      <section>
        <SectionLabel as="h2" className="mb-4">
          {t.exams.sectionBreakdown}
        </SectionLabel>
        <div className="space-y-4">
          {sectionScores.map((s) => {
            const pct = s.max > 0 ? Math.round((s.raw / s.max) * 100) : 0;
            return (
              <div key={s.sectionId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground/80">
                    {s.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection} ·{" "}
                    {sectionTitleById.get(s.sectionId)}
                  </span>
                  <span className="font-mono text-muted-foreground tabular-nums">
                    {s.raw}/{s.max} · {pct}%
                  </span>
                </div>
                {/* Under 60% the bar takes the red pen. */}
                <div className="mt-1.5 h-1 overflow-hidden bg-muted">
                  <div
                    className={`h-full ${pct >= 60 ? "bg-primary" : "bg-cinnabar"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Highest-intent moment for the funnel: exam finished → business content */}
      <CrossPromoCard track={attempt.track} />

      <AnswerReview sections={exam.sections} answers={attempt.answers} />
    </div>
  );
}
