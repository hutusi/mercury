import { ArrowLeft, ClipboardList } from "lucide-react";
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
        <Link
          href="/exams"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.exams}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{exam.titleZh}</h1>
        <p className="mt-1 text-muted-foreground">{exam.title}</p>
        <p className="mt-3 text-muted-foreground">{exam.descriptionZh}</p>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t.exams.sections}
        </h2>
        <ul className="space-y-3">
          {exam.sections.map((section, i) => {
            const count = section.groups.reduce((n, g) => n + g.questions.length, 0);
            return (
              <li key={section.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground/80">
                  {i + 1}.{" "}
                  {section.kind === "listening" ? t.exams.listeningSection : t.exams.readingSection}{" "}
                  · {section.titleZh}
                </span>
                <span className="text-muted-foreground">
                  {count} {t.common.questions} · {Math.round(section.durationSeconds / 60)}{" "}
                  {t.common.minutes}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-400/20 dark:bg-amber-400/10">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-400">
          <ClipboardList className="size-4" aria-hidden />
          {t.exams.rules}
        </h2>
        <ul className="space-y-2 text-sm text-foreground/80">
          {rules.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-amber-600 dark:text-amber-400">{i + 1}.</span>
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
