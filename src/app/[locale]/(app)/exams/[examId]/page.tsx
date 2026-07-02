import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { StartExamButton } from "@/components/exam/StartExamButton";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mockExamAttempts, mockExams } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";

export default async function ExamIntroPage({ params }: { params: Promise<{ examId: string }> }) {
  const user = await requireUser();
  const { examId } = await params;
  const t = await getDict();

  const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, examId) });
  if (!exam) notFound();

  const inProgress = await db.query.mockExamAttempts.findFirst({
    where: and(
      eq(mockExamAttempts.userId, user.id),
      eq(mockExamAttempts.examId, examId),
      eq(mockExamAttempts.status, "in_progress"),
    ),
  });

  const rules = [t.exams.rule1, t.exams.rule2, t.exams.rule3];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/exams" className="text-sm font-medium text-brand-600 hover:underline">
          ← {t.nav.exams}
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{exam.titleZh}</h1>
        <p className="mt-1 text-slate-500">{exam.title}</p>
        <p className="mt-3 text-slate-600">{exam.descriptionZh}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          {t.exams.sections}
        </h2>
        <ul className="space-y-3">
          {exam.sections.map((section, i) => {
            const count = section.groups.reduce((n, g) => n + g.questions.length, 0);
            return (
              <li key={section.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">
                  {i + 1}.{" "}
                  {section.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection}{" "}
                  · {section.titleZh}
                </span>
                <span className="text-slate-500">
                  {count} {t.common.questions} · {Math.round(section.durationSeconds / 60)}{" "}
                  {t.common.minutes}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-amber-700 uppercase">
          <span aria-hidden>📋</span> {t.exams.rules}
        </h2>
        <ul className="space-y-2 text-sm text-slate-700">
          {rules.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-amber-600">{i + 1}.</span>
              {rule}
            </li>
          ))}
        </ul>
      </section>

      <div className="text-center">
        <StartExamButton examId={exam.id} resume={!!inProgress} />
      </div>
    </div>
  );
}
