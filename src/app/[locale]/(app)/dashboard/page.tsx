import {
  BookMarked,
  BookOpenText,
  Headphones,
  Mic,
  NotebookPen,
  PenLine,
  Timer,
} from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { DueWordsCard } from "@/components/dashboard/DueWordsCard";
import { MistakesCard } from "@/components/dashboard/MistakesCard";
import { ExamBanner } from "@/components/dashboard/ExamBanner";
import { RecentScoresCard, type RecentScore } from "@/components/dashboard/RecentScoresCard";
import { ReminderNudge } from "@/components/dashboard/ReminderNudge";
import { ReminderToggle } from "@/components/dashboard/ReminderToggle";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { getDict } from "@/lib/i18n";
import { getDashboardData } from "@/lib/queries/dashboard";
import { requireTrack } from "@/lib/settings";

export default async function DashboardPage() {
  const { user, track, remindersEnabled } = await requireTrack();
  const t = await getDict();

  const {
    streak,
    dueCount,
    reminder,
    lastExam,
    inProgressExam,
    recentExercises,
    recentWriting,
    recentSpeaking,
    recentExams,
    activeMistakes,
    isNewUser,
  } = await getDashboardData(user.id, track);

  const exerciseLabel = (kind: string) =>
    kind === "reading" ? t.nav.reading : kind === "listening" ? t.nav.listening : t.vocab.quiz;

  const recentScores: RecentScore[] = [
    ...recentExercises.map((a) => ({
      date: a.completedAt,
      label: exerciseLabel(a.kind),
      detail: `${a.score}/${a.total}`,
    })),
    ...recentWriting.map((s) => ({
      date: s.createdAt,
      label: t.nav.writing,
      detail: s.feedback?.scoreLabel ?? "—",
    })),
    ...recentSpeaking.map((s) => ({
      date: s.createdAt,
      label: t.nav.speaking,
      detail: s.feedback?.scoreLabel ?? "—",
    })),
    ...recentExams.map((a) => ({
      date: a.completedAt ?? a.startedAt,
      label: t.nav.exams,
      detail:
        a.estimate?.kind === "toeic"
          ? `TOEIC ${a.estimate.total}`
          : a.estimate?.kind === "ielts"
            ? `IELTS ${a.estimate.band.toFixed(1)}`
            : "—",
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const quickLinks = [
    { href: "/vocabulary", label: t.nav.vocabulary, icon: BookMarked },
    { href: "/reading", label: t.nav.reading, icon: BookOpenText },
    { href: "/listening", label: t.nav.listening, icon: Headphones },
    { href: "/writing", label: t.nav.writing, icon: PenLine },
    { href: "/speaking", label: t.nav.speaking, icon: Mic },
    { href: "/mistakes", label: t.nav.mistakes, icon: NotebookPen },
    { href: "/exams", label: t.nav.exams, icon: Timer },
  ];

  return (
    <div className="space-y-10">
      <EntryHeader
        size="md"
        title={
          <>
            {t.dashboard.greeting}，{user.name || user.email}
          </>
        }
      />

      {/* Editorial asymmetry: work in the main column, numbers in the margin. */}
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-10">
          {isNewUser && <WelcomeCard />}
          {remindersEnabled && <ReminderNudge reminder={reminder} />}
          <ExamBanner
            lastEstimate={lastExam?.estimate ?? null}
            resumeExamId={inProgressExam?.examId ?? null}
          />
          {!isNewUser && <RecentScoresCard scores={recentScores} />}
        </div>

        <aside className="space-y-8">
          <StreakCard streak={streak} />
          <DueWordsCard dueCount={dueCount} />
          <MistakesCard activeCount={activeMistakes} />
          <div className="border-t border-border pt-4">
            <SectionLabel as="h2">{t.dashboard.quickStart}</SectionLabel>
            <ul className="mt-3 space-y-1">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`flex items-center gap-2.5 py-1.5 text-sm transition-colors ${
                      l.href === "/exams"
                        ? "text-cinnabar hover:text-cinnabar/80"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <l.icon className="size-4" aria-hidden />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* The funnel card: exam tracks → business content; business → mini-TOEIC */}
          <CrossPromoCard track={track} />
          <ReminderToggle enabled={remindersEnabled} />
        </aside>
      </div>
    </div>
  );
}
