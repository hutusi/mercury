import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { EmptyState } from "@/components/typography/EmptyState";
import { QuizRunner } from "@/components/vocab/QuizRunner";
import { getDict } from "@/lib/i18n";
import { createQuizSessionForUser } from "@/lib/services/vocab-quiz";
import { requireOnboarded } from "@/lib/settings";
import { parseTrackFilter } from "@/lib/track-filter";

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { user, goalTrack } = await requireOnboarded();
  const t = await getDict();

  // Quiz sessions are single-track (mistake identity bakes the track in), so
  // "all" resolves to the goal default rather than a cross-track pool.
  const { track } = parseTrackFilter((await searchParams).track, goalTrack);
  const session = await createQuizSessionForUser(user.id, track ?? goalTrack);

  if (!session.sessionId || session.questions.length === 0) {
    // Same shell as the populated page — the empty state keeps the header,
    // the way back, and a route to content (study feeds the quiz pool).
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/vocabulary"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t.nav.vocabulary}
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">{t.vocab.quiz}</h1>
        </div>
        <EmptyState
          action={
            <Link
              href="/vocabulary/study"
              className="text-sm font-medium text-foreground underline underline-offset-4 transition-colors hover:text-cinnabar"
            >
              {t.vocab.startStudy}
            </Link>
          }
        >
          {t.vocab.noWords}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/vocabulary"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.vocabulary}
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">{t.vocab.quiz}</h1>
      </div>
      {/* Keyed by session: router.refresh() resolves a NEW session, and
          without a remount the runner's client state (expired, picked) would
          survive and keep the old screen frozen. */}
      <QuizRunner
        key={session.sessionId}
        sessionId={session.sessionId}
        questions={session.questions}
        initialAnsweredIds={session.answeredIds}
      />
    </div>
  );
}
