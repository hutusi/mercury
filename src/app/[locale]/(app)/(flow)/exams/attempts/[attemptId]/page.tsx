import { NotebookPen } from "lucide-react";
import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { notFound } from "next/navigation";
import { AnswerReview } from "@/components/exam/AnswerReview";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { NextStopButton } from "@/components/flow/NextStopButton";
import { Button } from "@/components/ui/button";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { requireOnboarded } from "@/lib/settings";
import { getDict, localeRedirect } from "@/lib/i18n";
import { getAttemptWithExam } from "@/lib/queries/exams";

export default async function ExamReportPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const [{ user, timeZone }, { attemptId }, t] = await Promise.all([
    requireOnboarded(),
    params,
    getDict(),
  ]);

  const data = await getAttemptWithExam(user.id, attemptId);
  if (!data) notFound();
  const { attempt, exam } = data;
  if (attempt.status === "in_progress") return localeRedirect(`/exams/${attempt.examId}/take`);
  if (attempt.status === "abandoned") return localeRedirect(`/exams/${attempt.examId}`);

  const flow = await getFlowContext(user.id, timeZone, "mock_exam", attempt.examId);
  const estimate = attempt.estimate;
  const sectionScores = attempt.sectionScores ?? [];
  const sectionTitleById = new Map(exam.sections.map((s) => [s.id, s.titleZh]));

  const wrongCount = sectionScores.reduce((n, s) => n + (s.max - s.raw), 0);

  return (
    <>
      <FlowHeader context={flow} hubHref="/exams" />
      <FlowBody>
        <p className="text-[0.8125rem] text-muted-foreground">{exam.titleZh}</p>
        <h1 className="mt-2 font-serif text-[1.75rem] leading-tight font-medium sm:text-4xl">
          {t.exams.reportTitle}
        </h1>

        <section className="mt-6 rounded-xl border border-border bg-card px-6 py-7 text-center shadow-raised">
          {estimate?.kind === "toeic" ? (
            <>
              <p className="text-[0.8125rem] text-muted-foreground">{t.exams.totalEstimate}</p>
              <p className="mt-1 font-serif text-6xl leading-none font-medium tabular-nums">
                {estimate.total}
              </p>
              <div className="mt-5 flex justify-center gap-8 text-sm tabular-nums">
                <span>
                  <span className="text-muted-foreground">{t.exams.listeningSection} </span>
                  <strong className="font-semibold">{estimate.listening}</strong> / 495
                </span>
                <span>
                  <span className="text-muted-foreground">{t.exams.readingSection} </span>
                  <strong className="font-semibold">{estimate.reading}</strong> / 495
                </span>
              </div>
            </>
          ) : estimate?.kind === "ielts" ? (
            <>
              <p className="text-[0.8125rem] text-muted-foreground">{t.exams.bandEstimate}</p>
              <p className="mt-1 font-serif text-6xl leading-none font-medium tabular-nums">
                {estimate.band.toFixed(1)}
              </p>
            </>
          ) : null}
          <p className="mt-5 text-xs text-muted-foreground">{t.common.estimateNote}</p>
        </section>

        <section aria-labelledby="exam-breakdown" className="mt-8">
          <h2 id="exam-breakdown" className="text-[0.9375rem] font-semibold">
            {t.exams.sectionBreakdown}
          </h2>
          <ul className="mt-3 flex flex-col gap-4">
            {sectionScores.map((s) => {
              const pct = s.max > 0 ? Math.round((s.raw / s.max) * 100) : 0;
              return (
                <li key={s.sectionId}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">
                      {s.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {sectionTitleById.get(s.sectionId)}
                      </span>
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {s.raw}/{s.max} · {pct}%
                    </span>
                  </div>
                  {/* Under 60% the bar turns coral, like the weakest skill on Practice. */}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
                    <div
                      className={`h-full rounded-full ${pct >= 60 ? "bg-brand" : "bg-coral"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="mt-10">
          <AnswerReview sections={exam.sections} answers={attempt.answers} />
        </div>

        {/* The attempt just wrote its wrong answers into the notebook — the
            review loop is the next step; the plan's next stop leads. */}
        <div className="mt-8 flex flex-col gap-2.5">
          {flow.mode === "plan" ? <NextStopButton context={flow} className="w-full" /> : null}
          {wrongCount > 0 ? (
            <Button asChild variant="ghost" className="text-coral-ink hover:text-coral-ink">
              <Link href="/mistakes">
                <NotebookPen aria-hidden />
                {t.common.reviewWrongCta} · {wrongCount}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/exams">{t.nav.exams}</Link>
          </Button>
        </div>

        {/* Highest-intent moment for the funnel: exam finished → business content */}
        <div className="mt-8">
          <CrossPromoCard track={attempt.track} />
        </div>
      </FlowBody>
    </>
  );
}
