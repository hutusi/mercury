import { ArrowLeft, Sparkles } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { and, asc, eq, lte } from "drizzle-orm";
import { StudySession, type StudyCardData } from "@/components/vocab/StudySession";
import { db } from "@/lib/db";
import { srsCards, vocabWords } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

const MAX_DUE_PER_SESSION = 30;
const MAX_NEW_PER_SESSION = 10;

export default async function StudyPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();

  const dueRows = await db
    .select({ word: vocabWords })
    .from(srsCards)
    .innerJoin(vocabWords, eq(srsCards.wordId, vocabWords.id))
    .where(
      and(
        eq(srsCards.userId, user.id),
        eq(vocabWords.track, track),
        lte(srsCards.dueAt, new Date()),
      ),
    )
    .orderBy(asc(srsCards.dueAt))
    .limit(MAX_DUE_PER_SESSION);

  const startedRows = await db
    .select({ wordId: srsCards.wordId })
    .from(srsCards)
    .innerJoin(vocabWords, eq(srsCards.wordId, vocabWords.id))
    .where(and(eq(srsCards.userId, user.id), eq(vocabWords.track, track)));
  const startedIds = new Set(startedRows.map((r) => r.wordId));

  const trackWords = await db.query.vocabWords.findMany({
    where: eq(vocabWords.track, track),
    orderBy: vocabWords.sortOrder,
  });
  const newWords = trackWords.filter((w) => !startedIds.has(w.id)).slice(0, MAX_NEW_PER_SESSION);

  const cards: StudyCardData[] = [
    ...dueRows.map(({ word }) => ({ ...word, wordId: word.id, isNew: false })),
    ...newWords.map((word) => ({ ...word, wordId: word.id, isNew: true })),
  ];

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
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">{t.vocab.study}</h1>
      </div>
      {cards.length === 0 ? (
        <div className="mx-auto max-w-md border border-border p-10 text-center">
          <p className="flex justify-center" aria-hidden>
            <Sparkles className="size-6" />
          </p>
          <p className="mt-4 font-medium text-foreground/80">{t.vocab.allClear}</p>
          <Link
            href="/vocabulary/quiz"
            className="mt-6 inline-block bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
          >
            {t.vocab.startQuiz}
          </Link>
        </div>
      ) : (
        <StudySession cards={cards} />
      )}
    </div>
  );
}
