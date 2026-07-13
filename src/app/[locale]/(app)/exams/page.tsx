import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { type ExamEstimate } from "@/lib/db/schema";
import { getDict, getLocale } from "@/lib/i18n";
import { listExamsWithAttempts } from "@/lib/queries/exams";
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

  const { exams, attempts } = await listExamsWithAttempts(user.id, track);
  const examTitleById = new Map(exams.map((e) => [e.id, e.titleZh]));

  return (
    <div className="space-y-8">
      <EntryHeader
        title={t.nav.exams}
        ipa={t.entry.examIpa}
        pos={t.entry.examPos}
        gloss={t.exams.subtitle}
      />

      {track === "business" && (
        <Callout variant="accent" className="p-4 text-sm">
          <span className="font-medium">{t.crosspromo.businessToExamTitle}</span> ·{" "}
          <span className="text-muted-foreground">{t.crosspromo.businessToExamDesc}</span>
        </Callout>
      )}

      {/* Mock exams are the product's cinnabar moment. */}
      <ul className="divide-y divide-cinnabar/30 border-y border-cinnabar/40">
        {exams.map((exam) => (
          <li key={exam.id}>
            <Link
              href={`/exams/${exam.id}`}
              className="group flex items-center gap-4 py-6 transition-colors outline-none hover:bg-cinnabar/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <Badge variant="accent">{exam.track}</Badge>
                  <span className="font-mono text-2xs text-muted-foreground">
                    {exam.totalQuestions} {t.common.questions}
                  </span>
                </div>
                <h2 className="font-serif text-xl font-medium transition-colors group-hover:text-cinnabar">
                  {exam.titleZh}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{exam.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{exam.descriptionZh}</p>
              </div>
              <span className="shrink-0 text-cinnabar" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <SectionLabel as="h2" className="mb-3">
          {t.exams.attemptHistory}
        </SectionLabel>
        {attempts.length === 0 ? (
          <EmptyState>{t.exams.noAttempts}</EmptyState>
        ) : (
          <table className="w-full border-y border-border text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2.5 pr-4 font-mono text-2xs font-medium tracking-label text-muted-foreground uppercase">
                  {t.exams.attemptDate}
                </th>
                <th className="hidden px-4 py-2.5 font-mono text-2xs font-medium tracking-label text-muted-foreground uppercase sm:table-cell">
                  {t.nav.exams}
                </th>
                <th className="px-4 py-2.5 font-mono text-2xs font-medium tracking-label text-muted-foreground uppercase">
                  {t.common.score}
                </th>
                <th className="py-2.5 pl-4 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                    {a.startedAt.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {examTitleById.get(a.examId) ?? a.examId}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium tabular-nums">
                    {a.status === "in_progress" ? (
                      <span className="font-sans text-cinnabar">{t.exams.inProgress}</span>
                    ) : a.status === "abandoned" ? (
                      <span className="font-sans text-muted-foreground">{t.exams.abandoned}</span>
                    ) : (
                      formatEstimate(a.estimate)
                    )}
                  </td>
                  <td className="py-3 pl-4 text-right">
                    {a.status === "in_progress" ? (
                      <Link
                        href={`/exams/${a.examId}/take`}
                        className="font-medium text-cinnabar underline-offset-4 hover:underline"
                      >
                        {t.exams.resumeExam}
                      </Link>
                    ) : a.status === "completed" ? (
                      <Link
                        href={`/exams/attempts/${a.id}`}
                        className="font-medium underline underline-offset-4 transition-colors hover:text-cinnabar"
                      >
                        {t.exams.viewReport}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
