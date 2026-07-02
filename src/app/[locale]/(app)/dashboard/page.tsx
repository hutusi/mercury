import Link from "next/link";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { CrossPromoCard } from "@/components/dashboard/CrossPromoCard";
import { DueWordsCard } from "@/components/dashboard/DueWordsCard";
import { ExamBanner } from "@/components/dashboard/ExamBanner";
import { RecentScoresCard, type RecentScore } from "@/components/dashboard/RecentScoresCard";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { db } from "@/lib/db";
import {
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
  ]);

  const dueCount = dueRows[0]?.count ?? 0;

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
    { href: "/vocabulary", label: t.nav.vocabulary, icon: "📚" },
    { href: "/reading", label: t.nav.reading, icon: "📖" },
    { href: "/listening", label: t.nav.listening, icon: "🎧" },
    { href: "/writing", label: t.nav.writing, icon: "✍️" },
    { href: "/speaking", label: t.nav.speaking, icon: "🎤" },
    { href: "/exams", label: t.nav.exams, icon: "⏱️" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">
        {t.dashboard.greeting}，{user.name || user.email}
      </h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StreakCard streak={streak} />
        <DueWordsCard dueCount={dueCount} />
        <ExamBanner
          lastEstimate={lastExam?.estimate ?? null}
          resumeExamId={inProgressExam?.examId ?? null}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentScoresCard scores={recentScores} />
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              {t.dashboard.quickStart}
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {quickLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="block text-xl" aria-hidden>
                    {l.icon}
                  </span>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          {/* The funnel card: exam tracks → business content; business → mini-TOEIC */}
          <CrossPromoCard track={track} />
        </div>
      </div>
    </div>
  );
}
