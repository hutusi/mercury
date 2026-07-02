import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { eq, sql } from "drizzle-orm";
import { QuizRunner, type QuizQuestion } from "@/components/vocab/QuizRunner";
import { db } from "@/lib/db";
import { vocabWords } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";

const QUIZ_SIZE = 10;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default async function QuizPage() {
  const { track } = await requireTrack();
  const t = await getDict();

  const words = await db.query.vocabWords.findMany({
    where: eq(vocabWords.track, track),
    orderBy: sql`random()`,
    limit: QUIZ_SIZE + 15,
  });

  if (words.length < 4) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
        {t.vocab.noWords}
      </div>
    );
  }

  const quizWords = words.slice(0, QUIZ_SIZE);
  const questions: QuizQuestion[] = quizWords.map((word, i) => {
    const direction = i % 2 === 0 ? ("en2zh" as const) : ("zh2en" as const);
    const distractors = shuffle(words.filter((w) => w.id !== word.id)).slice(0, 3);
    const options = shuffle(
      [word, ...distractors].map((w) => ({
        wordId: w.id,
        text: direction === "en2zh" ? w.translationZh : w.headword,
      })),
    );
    return {
      wordId: word.id,
      direction,
      prompt: direction === "en2zh" ? word.headword : word.translationZh,
      options,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/vocabulary"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.vocabulary}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t.vocab.quiz}</h1>
      </div>
      <QuizRunner track={track} questions={questions} />
    </div>
  );
}
