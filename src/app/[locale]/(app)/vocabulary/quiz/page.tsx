import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
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
    return (
      <div className="border-y border-border py-12 text-center text-muted-foreground">
        {t.vocab.noWords}
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
      <QuizRunner sessionId={session.sessionId} questions={session.questions} />
    </div>
  );
}
