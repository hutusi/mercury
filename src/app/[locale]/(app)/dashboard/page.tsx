import { BookMarked, BookOpenText, Headphones, Mic, PenLine, Timer } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { DueWordsCard } from "@/components/dashboard/DueWordsCard";
import { ExamBanner } from "@/components/dashboard/ExamBanner";
import { RecentScoresCard, type RecentScore } from "@/components/dashboard/RecentScoresCard";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { db } from "@/lib/db";
import {
  activityDays,
  exerciseAttempts,
  mockExamAttempts,
  speakingSubmissions,
  srsCards,
  vocabWords,
  writingSubmissions,
} from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";
import { getStreak } from "@/lib/streak";

export default async function DashboardPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();

  const [
    streak,
    dueRows,
    lastExam,
    inProgressExam,
    recentExercises,
    recentWriting,
    recentSpeaking,
    recentExams,
    firstActivity,
  ] = await Promise.all([
    getStreak(user.id),
    db
      .select({ count: sql<number>`count(*)` })
      .from(srsCards)
      .innerJoin(vocabWords, eq(srsCards.wordId, vocabWords.id))
      .where(
        and(
          eq(srsCards.userId, user.id),
          eq(vocabWords.track, track),
          lte(srsCards.dueAt, new Date()),
        ),
      ),
    db.query.mockExamAttempts.findFirst({
      where: and(eq(mockExamAttempts.userId, user.id), eq(mockExamAttempts.status, "completed")),
      orderBy: desc(mockExamAttempts.completedAt),
    }),
    db.query.mockExamAttempts.findFirst({
      where: and(eq(mockExamAttempts.userId, user.id), eq(mockExamAttempts.status, "in_progress")),
      orderBy: desc(mockExamAttempts.startedAt),
    }),
    db.query.exerciseAttempts.findMany({
      where: eq(exerciseAttempts.userId, user.id),
      orderBy: desc(exerciseAttempts.completedAt),
      limit: 5,
    }),
    db.query.writingSubmissions.findMany({
      where: and(
        eq(writingSubmissions.userId, user.id),
        eq(writingSubmissions.status, "ai_scored"),
      ),
      orderBy: desc(writingSubmissions.createdAt),
      limit: 5,
    }),
    db.query.speakingSubmissions.findMany({
      where: and(
        eq(speakingSubmissions.userId, user.id),
        eq(speakingSubmissions.status, "ai_scored"),
      ),
      orderBy: desc(speakingSubmissions.createdAt),
      limit: 5,
    }),
    db.query.mockExamAttempts.findMany({
      where: and(eq(mockExamAttempts.userId, user.id), eq(mockExamAttempts.status, "completed")),
      orderBy: desc(mockExamAttempts.completedAt),
      limit: 5,
    }),
    // Any completed activity ever — drives the first-run guidance below.
    db.query.activityDays.findFirst({ where: eq(activityDays.userId, user.id) }),
  ]);

  const dueCount = dueRows[0]?.count ?? 0;
  // Brand-new account: nothing done yet and not mid-exam. Show orientation
  // instead of a wall of zeros.
  const isNewUser = !firstActivity && !inProgressExam;

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
          <ExamBanner
            lastEstimate={lastExam?.estimate ?? null}
            resumeExamId={inProgressExam?.examId ?? null}
          />
          {!isNewUser && <RecentScoresCard scores={recentScores} />}
        </div>

        <aside className="space-y-8">
          <StreakCard streak={streak} />
          <DueWordsCard dueCount={dueCount} />
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
        </aside>
      </div>
    </div>
  );
}
