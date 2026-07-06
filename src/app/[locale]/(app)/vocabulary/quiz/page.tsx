import { ArrowLeft } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { eq, sql } from "drizzle-orm";
import { QuizRunner } from "@/components/vocab/QuizRunner";
import { db } from "@/lib/db";
import { vocabWords } from "@/lib/db/schema";
import { getDict } from "@/lib/i18n";
import { requireTrack } from "@/lib/settings";
import { buildQuizQuestion, type QuizQuestion } from "@/lib/vocab-quiz-core";

const QUIZ_SIZE = 10;

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
      <div className="border-y border-border py-12 text-center text-muted-foreground">
        {t.vocab.noWords}
      </div>
    );
  }

  const quizWords = words.slice(0, QUIZ_SIZE);
  const questions: QuizQuestion[] = quizWords.map((word, i) =>
    buildQuizQuestion(word, words, i % 2 === 0 ? "en2zh" : "zh2en"),
  );

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
      <QuizRunner track={track} questions={questions} />
    </div>
  );
}
