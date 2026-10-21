import { ArrowRight, Flame } from "lucide-react";
import { StationNode } from "@/components/layout/Wordmark";
import type { ExamEstimate } from "@/lib/db/schema";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import type { Locale } from "@/lib/i18n/locale";
import { daysUntil, type CoachMemo } from "@/lib/learner-model-core";
import type { WeekDot } from "@/lib/streak-core";
import { formatTargetScore } from "@/lib/target-score";
import { cn } from "@/lib/utils";
import type { ExamTrack } from "@/content/types";

const CARD = "rounded-xl border border-border bg-card p-5";

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-3.5 inline-flex items-center gap-1.5 rounded-sm text-[0.8125rem] font-medium text-brand-ink outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

/** Streak count, this week's check-ins, and whether today is checked in. */
export function StreakCard({
  t,
  streak,
  week,
  checkedIn,
  atRisk,
}: {
  t: Dictionary;
  streak: number;
  week: WeekDot[];
  checkedIn: boolean;
  /** Studied yesterday, not yet today, and reminders are on. */
  atRisk: boolean;
}) {
  const labels = t.today.weekdays.split(",");
  return (
    <section className={CARD} aria-labelledby="streak-label">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id="streak-label" className="text-[0.8125rem] text-muted-foreground">
            {t.dashboard.streak}
          </p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-serif text-[2.75rem] leading-none font-medium tabular-nums">
              {streak}
            </span>
            <span className="text-sm text-muted-foreground">{t.dashboard.streakDays}</span>
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-full bg-coral-soft">
          <Flame className="size-5 text-coral" aria-hidden />
        </span>
      </div>
      <ol className="mt-[1.125rem] grid grid-cols-7 gap-1 text-center" aria-hidden>
        {week.map((d, i) => (
          <li key={d.day} className="flex flex-col items-center gap-[0.4375rem]">
            <span
              className={cn(
                "text-xs",
                d.isToday ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {labels[i]}
            </span>
            <span
              className={cn(
                "size-3 rounded-full border-2 transition-colors duration-300",
                d.active ? "border-coral bg-coral" : d.isToday ? "border-coral" : "border-input",
              )}
            />
          </li>
        ))}
      </ol>
      <p
        className={cn(
          "mt-3.5 border-t border-border pt-3 text-[0.8125rem]",
          checkedIn || atRisk ? "text-coral-ink" : "text-muted-foreground",
        )}
      >
        {checkedIn
          ? t.today.checked
          : atRisk
            ? t.dashboard.reminderStreakTitle
            : t.today.notChecked}
      </p>
    </section>
  );
}

function formatEstimate(estimate: ExamEstimate | null): string | null {
  if (!estimate) return null;
  return estimate.kind === "toeic" ? String(estimate.total) : estimate.band.toFixed(1);
}

function estimateRatio(estimate: ExamEstimate | null, track: ExamTrack, target: number | null) {
  if (!estimate || target === null) return null;
  const value = estimate.kind === "toeic" ? estimate.total : estimate.band * 10;
  return track === "ielts" || track === "toeic" ? Math.min(1, value / target) : null;
}

/** Days to the exam and the latest estimate against the target. */
export function ExamCountdownCard({
  t,
  locale,
  today,
  exam,
}: {
  t: Dictionary;
  locale: Locale;
  today: Date;
  exam: {
    track: ExamTrack;
    examDate: string | null;
    targetScore: number | null;
    lastEstimate: ExamEstimate | null;
  };
}) {
  const examName =
    exam.track === "toeic" ? t.tracks.toeic.split(" ")[0] : t.tracks.ielts.split(" ")[0];
  const days = exam.examDate ? daysUntil(exam.examDate, today) : null;
  const date = exam.examDate
    ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${exam.examDate}T00:00:00Z`))
    : null;
  const estimate = formatEstimate(exam.lastEstimate);
  const target = formatTargetScore(exam.track, exam.targetScore);
  const ratio = estimateRatio(exam.lastEstimate, exam.track, exam.targetScore);

  return (
    <section className={CARD}>
      <p className="text-[0.8125rem] text-muted-foreground">
        {date ? fill(t.today.examTitle, { exam: examName, date }) : t.practice.examTitle}
      </p>
      {days !== null && days >= 0 ? (
        <p className="mt-1.5 flex items-baseline gap-1.5">
          {t.today.examIn ? (
            <span className="text-sm text-muted-foreground">{t.today.examIn}</span>
          ) : null}
          <span className="font-serif text-4xl leading-none font-medium tabular-nums">{days}</span>
          <span className="text-sm text-muted-foreground">{t.dashboard.streakDays}</span>
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-muted-foreground">
          {days !== null ? t.today.examPassed : t.today.examNoDate}
        </p>
      )}
      {estimate || target ? (
        <>
          <div className="mt-4 flex justify-between text-[0.8125rem] text-muted-foreground tabular-nums">
            <span>
              {t.practice.lastEstimate} {estimate ?? "—"}
            </span>
            <span>
              {t.practice.target} {target ?? "—"}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.round((ratio ?? 0) * 100)}%` }}
            />
          </div>
        </>
      ) : null}
      {days === null ? (
        <CardLink href="/settings">{t.today.examSetDate}</CardLink>
      ) : (
        <CardLink href="/exams">{t.today.examCta}</CardLink>
      )}
    </section>
  );
}

/** What the coach has noticed lately, from the learner model's memo. */
export function CoachMemoCard({ t, memo }: { t: Dictionary; memo: CoachMemo | null }) {
  const notes = [...(memo?.issues ?? [])]
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
    .slice(0, 2)
    .map((item) => item.noteZh);
  return (
    <section className="rounded-xl bg-muted p-5">
      <p className="flex items-center gap-2.5 text-[0.8125rem] font-semibold">
        <StationNode className="size-6" />
        {t.today.memo}
      </p>
      <p className="mt-3 text-sm leading-[1.75] text-pretty text-soft-3">
        {notes.length > 0 ? notes.join(" ") : t.today.memoEmpty}
      </p>
      <CardLink href="/tutor">{t.today.memoCta}</CardLink>
    </section>
  );
}
