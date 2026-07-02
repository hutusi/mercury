import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { mockExamAttempts, mockExams, type ExamEstimate } from "@/lib/db/schema";
import { getDict, getLocale } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

function formatEstimate(estimate: ExamEstimate | null): string {
  if (!estimate) return "—";
  if (estimate.kind === "toeic") return `TOEIC ${estimate.total}`;
  return `IELTS ${estimate.band.toFixed(1)}`;
}

export default async function ExamsPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();
  const locale = await getLocale();

  // Exam-track users see their own exam first; business users see both —
  // the mini-TOEIC is the reverse funnel's benchmark hook.
  const exams = await db.query.mockExams.findMany({
    where:
      track === "business"
        ? inArray(mockExams.track, ["toeic", "ielts"])
        : eq(mockExams.track, track),
  });

  const attempts = await db.query.mockExamAttempts.findMany({
    where: eq(mockExamAttempts.userId, user.id),
    orderBy: desc(mockExamAttempts.startedAt),
    limit: 20,
  });
  const examTitleById = new Map(exams.map((e) => [e.id, e.titleZh]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          <span aria-hidden>⏱️</span> {t.nav.exams}
        </h1>
        <p className="mt-1 text-slate-500">{t.exams.subtitle}</p>
      </div>

      {track === "business" && (
        <div className="rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-700">
          <span className="font-semibold">{t.crosspromo.businessToExamTitle}</span> ·{" "}
          {t.crosspromo.businessToExamDesc}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {exams.map((exam) => (
          <Link
            key={exam.id}
            href={`/exams/${exam.id}`}
            className="group rounded-xl border-2 border-accent-200 bg-white p-6 shadow-sm transition hover:border-accent-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-accent-700 uppercase">
                {exam.track}
              </span>
              <span className="text-xs text-slate-400">
                {exam.totalQuestions} {t.common.questions}
              </span>
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-accent-700">
              {exam.titleZh}
            </h2>
            <p className="text-sm text-slate-500">{exam.title}</p>
            <p className="mt-3 text-sm text-slate-600">{exam.descriptionZh}</p>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">{t.exams.attemptHistory}</h2>
        {attempts.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {t.exams.noAttempts}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-3">{t.exams.attemptDate}</th>
                  <th className="hidden px-4 py-3 sm:table-cell">{t.nav.exams}</th>
                  <th className="px-4 py-3">{t.common.score}</th>
                  <th className="px-4 py-3 text-right" />
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-600">
                      {a.startedAt.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                      {examTitleById.get(a.examId) ?? a.examId}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {a.status === "in_progress" ? (
                        <span className="text-accent-600">{t.exams.inProgress}</span>
                      ) : (
                        formatEstimate(a.estimate)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.status === "in_progress" ? (
                        <Link
                          href={`/exams/${a.examId}/take`}
                          className="font-medium text-accent-600 hover:underline"
                        >
                          {t.exams.resumeExam}
                        </Link>
                      ) : (
                        <Link
                          href={`/exams/attempts/${a.id}`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          {t.exams.viewReport}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
