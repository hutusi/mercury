import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { AnswerReview } from "@/components/exam/AnswerReview";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mockExamAttempts, mockExams } from "@/lib/db/schema";
import { getDict, localeRedirect } from "@/lib/i18n";

export default async function ExamReportPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await requireUser();
  const { attemptId } = await params;
  const t = await getDict();

  const attempt = await db.query.mockExamAttempts.findFirst({
    where: and(eq(mockExamAttempts.id, attemptId), eq(mockExamAttempts.userId, user.id)),
  });
  if (!attempt) notFound();
  if (attempt.status === "in_progress") return localeRedirect(`/exams/${attempt.examId}/take`);

  const exam = await db.query.mockExams.findFirst({
    where: eq(mockExams.id, attempt.examId),
  });
  if (!exam) notFound();

  const estimate = attempt.estimate;
  const sectionScores = attempt.sectionScores ?? [];
  const sectionTitleById = new Map(exam.sections.map((s) => [s.id, s.titleZh]));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/exams" className="text-sm font-medium text-brand-600 hover:underline">
          ← {t.nav.exams}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{t.exams.reportTitle}</h1>
        <p className="text-slate-500">{exam.titleZh}</p>
      </div>

      {/* Estimate hero */}
      <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-8 text-center">
        {estimate?.kind === "toeic" ? (
          <>
            <p className="text-sm font-medium text-amber-700">{t.exams.totalEstimate}</p>
            <p className="mt-2 text-6xl font-bold text-slate-900">{estimate.total}</p>
            <div className="mt-4 flex justify-center gap-8 text-sm">
              <span>
                {t.exams.listeningSection}:{" "}
                <strong className="text-slate-900">{estimate.listening}</strong> / 495
              </span>
              <span>
                {t.exams.readingSection}:{" "}
                <strong className="text-slate-900">{estimate.reading}</strong> / 495
              </span>
            </div>
          </>
        ) : estimate?.kind === "ielts" ? (
          <>
            <p className="text-sm font-medium text-amber-700">{t.exams.bandEstimate}</p>
            <p className="mt-2 text-6xl font-bold text-slate-900">{estimate.band.toFixed(1)}</p>
          </>
        ) : null}
        <p className="mt-4 text-xs text-slate-400">{t.common.estimateNote}</p>
      </div>

      {/* Section breakdown */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          {t.exams.sectionBreakdown}
        </h2>
        <div className="space-y-3">
          {sectionScores.map((s) => {
            const pct = s.max > 0 ? Math.round((s.raw / s.max) * 100) : 0;
            return (
              <div key={s.sectionId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">
                    {s.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection} ·{" "}
                    {sectionTitleById.get(s.sectionId)}
                  </span>
                  <span className="text-slate-600">
                    {s.raw}/{s.max} · {pct}%
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${pct >= 60 ? "bg-green-500" : "bg-amber-500"}`}
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
