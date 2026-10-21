import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { PracticeExam } from "@/lib/queries/practice";
import { formatTargetScore } from "@/lib/target-score";

function formatEstimate(exam: PracticeExam): string | null {
  const e = exam.lastEstimate;
  if (!e) return null;
  return e.kind === "toeic" ? String(e.total) : e.band.toFixed(1);
}

/** The one dark surface: the mock exam, with the latest estimate against the target. */
export async function MockExamCard({
  exam,
  targetScore,
  note,
}: {
  exam: PracticeExam;
  targetScore: number | null;
  /** Shown under the description (e.g. why a business learner sees TOEIC). */
  note?: string;
}) {
  const t = await getDict();
  const estimate = formatEstimate(exam);
  const target = formatTargetScore(exam.track, targetScore);

  return (
    <section className="flex flex-wrap items-center gap-x-8 gap-y-5 rounded-2xl bg-feature p-6 text-feature-foreground sm:p-8">
      <div className="min-w-0 flex-[999_1_18rem]">
        <p className="flex items-center gap-2 text-[0.8125rem] text-feature-accent">
          <Timer className="size-4" aria-hidden />
          <span>
            {exam.titleZh} ·{" "}
            {fill(t.practice.examMeta, { n: exam.totalQuestions, m: exam.minutes })}
          </span>
        </p>
        <h2 className="mt-2.5 font-serif text-[1.625rem] leading-tight font-medium sm:text-[2rem]">
          {t.practice.examTitle}
        </h2>
        <p className="mt-1.5 text-[0.9375rem] text-feature-muted">{t.practice.examDesc}</p>
        {note ? <p className="mt-2 text-[0.8125rem] text-feature-muted">{note}</p> : null}
      </div>
      <div className="flex min-w-0 flex-[1_1_13rem] flex-col gap-4">
        <dl className="flex gap-6">
          <div>
            <dt className="text-xs text-feature-muted">{t.practice.lastEstimate}</dt>
            <dd className="mt-1 font-serif text-[1.875rem] leading-none font-medium tabular-nums">
              {estimate ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-feature-muted">{t.practice.target}</dt>
            <dd className="mt-1 font-serif text-[1.875rem] leading-none font-medium text-feature-accent tabular-nums">
              {target ?? "—"}
            </dd>
          </div>
        </dl>
        <Button asChild variant="inverse" className="self-start">
          <Link href={`/exams/${exam.id}`}>
            {exam.inProgress ? t.practice.examResume : t.practice.examCta}
          </Link>
        </Button>
      </div>
    </section>
  );
}
