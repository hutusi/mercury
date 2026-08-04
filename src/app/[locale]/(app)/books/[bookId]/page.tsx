import { ArrowLeft, Check, Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { getBookForUser } from "@/lib/queries/books";
import { requireOnboarded } from "@/lib/settings";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { user } = await requireOnboarded();
  const { bookId } = await params;
  const t = await getDict();

  const data = await getBookForUser(user.id, bookId);
  if (!data) notFound();
  const { book, chapters } = data;

  const current = chapters.find((c) => !c.completed && !c.locked) ?? null;
  const anyCompleted = chapters.some((c) => c.completed);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/books"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.common.back}
        </Link>
        <header className="mt-2 border-b border-border pb-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h1 className="font-serif text-4xl font-medium tracking-tight text-balance sm:text-5xl">
                {book.title}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {book.titleZh} · {book.author}
                {book.authorZh ? `（${book.authorZh}）` : ""}
              </p>
              <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
                {book.descriptionZh}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{book.cefrLevel}</Badge>
                {book.genres.map((genre) => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                ))}
                <span className="font-mono text-2xs text-muted-foreground">
                  {book.chapterCount} {t.books.chapterUnit} ·{" "}
                  {book.wordCount.toLocaleString("en-US")} {t.books.words}
                </span>
              </div>
            </div>
            {current && (
              <Button asChild size="lg" className="h-11">
                <Link href={`/books/${book.id}/chapters/${current.id}`}>
                  {anyCompleted ? t.books.continueReading : t.books.startReading}
                </Link>
              </Button>
            )}
          </div>
        </header>
      </div>

      <EntryList>
        {chapters.map((chapter) => (
          <EntryRow
            key={chapter.id}
            href={chapter.locked ? undefined : `/books/${book.id}/chapters/${chapter.id}`}
            className={chapter.locked ? "opacity-60" : undefined}
            meta={
              <span className="font-mono text-2xs text-muted-foreground tabular-nums">
                {String(chapter.sortOrder).padStart(2, "0")}
              </span>
            }
            title={chapter.title}
            subtitle={chapter.titleZh}
            right={
              chapter.locked ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Lock className="size-3.5" aria-hidden />
                  {t.books.locked}
                  {/* The unlock rule was a hover-only title attribute —
                      unreachable by keyboard and untouchable on mobile. */}
                  <span className="sr-only">{t.books.lockedNote}</span>
                </span>
              ) : (
                <div className="text-right">
                  <p className="font-mono text-2xs text-muted-foreground">
                    {chapter.wordCount.toLocaleString("en-US")} {t.books.words} ·{" "}
                    {chapter.estMinutes} {t.common.minutes}
                  </p>
                  {chapter.completed && chapter.best ? (
                    <p className="mt-1 flex items-center justify-end gap-1 font-mono text-xs font-medium text-foreground tabular-nums">
                      <Check className="size-3.5" aria-hidden />
                      {t.reading.bestScore}: {chapter.best.score}/{chapter.best.total}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-foreground">
                      {anyCompleted ? t.books.continueReading : t.books.startReading}
                    </p>
                  )}
                </div>
              )
            }
          />
        ))}
      </EntryList>
    </div>
  );
}
