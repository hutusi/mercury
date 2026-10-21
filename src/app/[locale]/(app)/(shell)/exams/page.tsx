import { ArrowRight } from "lucide-react";
import { TrackFilterChips } from "@/components/layout/TrackFilterChips";
import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { type ExamEstimate } from "@/lib/db/schema";
import { formatLearnerDate } from "@/lib/format-date";
import { getDict, getLocale } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { listExamsWithAttempts } from "@/lib/queries/exams";
import { requireOnboarded } from "@/lib/settings";
import { EXAM_TRACK_FILTER_OPTIONS, parseExamTrackFilter } from "@/lib/track-filter";

function formatEstimate(estimate: ExamEstimate | null): string {
  if (!estimate) return "—";
  if (estimate.kind === "toeic") return `TOEIC ${estimate.total}`;
  return `IELTS ${estimate.band.toFixed(1)}`;
}

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const [{ user, goalTrack, timeZone }, t, locale, { track: trackParam }] = await Promise.all([
    requireOnboarded(),
    getDict(),
    getLocale(),
    searchParams,
  ]);
  const { filter, track } = parseExamTrackFilter(trackParam, goalTrack);
  const { exams, attempts } = await listExamsWithAttempts(user.id, track);
  const examTitleById = new Map(exams.map((e) => [e.id, e.titleZh]));

  return (
    <div className="flex flex-col gap-8">
      <EntryHeader
        title={t.nav.exams}
        ipa={t.entry.examIpa}
        pos={t.entry.examPos}
        gloss={t.exams.subtitle}
      />

      <TrackFilterChips basePath="/exams" current={filter} options={EXAM_TRACK_FILTER_OPTIONS} />

      {goalTrack === "business" ? (
        <Callout variant="accent" className="px-4 py-3 text-sm">
          <span className="font-medium">{t.crosspromo.businessToExamTitle}</span> ·{" "}
          <span className="text-soft-3">{t.crosspromo.businessToExamDesc}</span>
        </Callout>
      ) : null}

      <ul className="grid gap-3.5 sm:grid-cols-2">
        {exams.map((exam) => {
          const minutes = Math.max(
            1,
            Math.round(exam.sections.reduce((s, x) => s + x.durationSeconds, 0) / 60),
          );
          return (
            <li key={exam.id}>
              <Link
                href={`/exams/${exam.id}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 outline-hidden transition-colors duration-150 hover:border-input hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">{exam.track.toUpperCase()}</Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {fill(t.practice.examMeta, { n: exam.totalQuestions, m: minutes })}
                  </span>
                </div>
                <h2 className="mt-3 font-serif text-xl leading-snug font-medium">{exam.titleZh}</h2>
                <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{exam.title}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-soft-3">
                  {exam.descriptionZh}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-ink">
                  {t.exams.startExam}
                  <ArrowRight
                    className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <section>
        <SectionLabel as="h2">{t.exams.attemptHistory}</SectionLabel>
        {attempts.length === 0 ? (
          <EmptyState className="mt-3">{t.exams.noAttempts}</EmptyState>
        ) : (
          <EntryList className="mt-3">
            {attempts.map((a) => (
              <EntryRow
                key={a.id}
                href={
                  a.status === "in_progress"
                    ? `/exams/${a.examId}/take`
                    : a.status === "completed"
                      ? `/exams/attempts/${a.id}`
                      : undefined
                }
                title={examTitleById.get(a.examId) ?? a.examId}
                subtitle={formatLearnerDate(a.startedAt, locale, timeZone)}
                right={
                  a.status === "in_progress" ? (
                    <Badge variant="accent">{t.exams.resumeExam}</Badge>
                  ) : a.status === "abandoned" ? (
                    <span>{t.exams.abandoned}</span>
                  ) : (
                    <span className="font-medium text-foreground">
                      {formatEstimate(a.estimate)}
                      <span className="sr-only"> · {t.exams.viewReport}</span>
                    </span>
                  )
                }
              />
            ))}
          </EntryList>
        )}
      </section>
    </div>
  );
}
