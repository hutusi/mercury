import { ArrowLeft, Sparkles } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { StudySession, type StudyCardData } from "@/components/vocab/StudySession";
import { getDict } from "@/lib/i18n";
import { getStudyQueue } from "@/lib/queries/vocab";
import { requireTrack } from "@/lib/settings";

export default async function StudyPage() {
  const { user, track } = await requireTrack();
  const t = await getDict();

  const cards: StudyCardData[] = await getStudyQueue(user.id, track);

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
