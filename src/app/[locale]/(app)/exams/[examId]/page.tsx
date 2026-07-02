import { ArrowLeft, ClipboardList } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { StartExamButton } from "@/components/exam/StartExamButton";
import { SectionLabel } from "@/components/typography/SectionLabel";
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
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/exams"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.exams}
        </Link>
        <header className="mt-4 border-b border-border pb-6">
          <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">
            {exam.titleZh}
          </h1>
          <p className="mt-1 font-serif text-lg text-muted-foreground italic">{exam.title}</p>
          <p className="mt-3 text-muted-foreground">{exam.descriptionZh}</p>
        </header>
      </div>

      <section>
        <SectionLabel as="h2" className="mb-4">
          {t.exams.sections}
        </SectionLabel>
        <ul className="divide-y divide-border border-y border-border">
          {exam.sections.map((section, i) => {
            const count = section.groups.reduce((n, g) => n + g.questions.length, 0);
            return (
              <li key={section.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="font-medium">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}.</span>
                  {section.kind === "listening"
                    ? t.exams.listeningSection
                    : t.exams.readingSection}{" "}
                  · {section.titleZh}
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {count} {t.common.questions} · {Math.round(section.durationSeconds / 60)}{" "}
                  {t.common.minutes}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border border-cinnabar/40 bg-cinnabar/5 p-6">
        <SectionLabel as="h2" className="mb-3 flex items-center gap-1.5 text-cinnabar">
          <ClipboardList className="size-4" aria-hidden />
          {t.exams.rules}
        </SectionLabel>
        <ul className="space-y-2 text-sm text-foreground/80">
          {rules.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono font-medium text-cinnabar">{i + 1}.</span>
              {rule}
            </li>
          ))}
        </ul>
      </section>

      <div>
        <StartExamButton examId={exam.id} resume={!!inProgress} />
      </div>
    </div>
  );
}
