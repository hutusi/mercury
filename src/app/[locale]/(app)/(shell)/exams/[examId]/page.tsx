import { ArrowLeft, Headphones, BookOpenText } from "lucide-react";
import { notFound } from "next/navigation";
import { StartExamButton } from "@/components/exam/StartExamButton";
import { requireUser } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { getExamIntro } from "@/lib/queries/exams";

export default async function ExamIntroPage({ params }: { params: Promise<{ examId: string }> }) {
  const [user, { examId }, t] = await Promise.all([requireUser(), params, getDict()]);
  const data = await getExamIntro(user.id, examId);
  if (!data) notFound();
  const { exam, inProgress } = data;

  const rules = [t.exams.rule1, t.exams.rule2, t.exams.rule3];
  const minutes = Math.round(exam.sections.reduce((s, x) => s + x.durationSeconds, 0) / 60);

  return (
    <div className="mx-auto flex max-w-[45rem] flex-col gap-8">
      <div>
        <Link
          href="/exams"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.exams}
        </Link>
        <header className="mt-4">
          <p className="text-[0.8125rem] text-muted-foreground tabular-nums">
            {fill(t.practice.examMeta, { n: exam.totalQuestions, m: minutes })}
          </p>
          <h1 className="mt-2 font-serif text-[1.875rem] leading-tight font-medium text-balance sm:text-[2.625rem]">
            {exam.titleZh}
          </h1>
          <p className="mt-1 font-serif text-lg text-muted-foreground">{exam.title}</p>
          <p className="mt-3 leading-relaxed text-soft-3">{exam.descriptionZh}</p>
        </header>
      </div>

      <section aria-labelledby="exam-sections">
        <h2 id="exam-sections" className="text-[0.9375rem] font-semibold">
          {t.exams.sections}
        </h2>
        <ol className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {exam.sections.map((section, i) => {
            const count = section.groups.reduce((n, g) => n + g.questions.length, 0);
            const Icon = section.kind === "listening" ? Headphones : BookOpenText;
            return (
              <li key={section.id} className="flex items-center gap-3.5 px-5 py-4">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-soft-2"
                >
                  <Icon className="size-[1.125rem]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-medium">
                    {i + 1}.{" "}
                    {section.kind === "listening"
                      ? t.exams.listeningSection
                      : t.exams.readingSection}
                  </p>
                  <p className="truncate text-[0.8125rem] text-muted-foreground">
                    {section.titleZh}
                  </p>
                </div>
                <span className="shrink-0 text-[0.8125rem] text-muted-foreground tabular-nums">
                  {count} {t.common.questions} · {Math.round(section.durationSeconds / 60)}{" "}
                  {t.common.minutes}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="exam-rules" className="rounded-xl bg-muted px-5 py-4">
        <h2 id="exam-rules" className="text-[0.9375rem] font-semibold">
          {t.exams.rules}
        </h2>
        <ol className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-soft-3">
          {rules.map((rule, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="font-serif font-medium text-brand-ink italic">{i + 1}</span>
              {rule}
            </li>
          ))}
        </ol>
      </section>

      <StartExamButton examId={exam.id} inProgressAttemptId={inProgress?.id ?? null} />
    </div>
  );
}
