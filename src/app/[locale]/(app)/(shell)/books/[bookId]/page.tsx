import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { getBookForUser } from "@/lib/queries/books";
import { requireOnboarded } from "@/lib/settings";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const [{ user }, { bookId }, t] = await Promise.all([requireOnboarded(), params, getDict()]);

  const data = await getBookForUser(user.id, bookId);
  if (!data) notFound();
  const { book, chapters } = data;

  const current = chapters.find((c) => !c.completed && !c.locked) ?? null;
  const anyCompleted = chapters.some((c) => c.completed);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/books"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t.nav.books}
        </Link>
        <header className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="max-w-2xl min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{book.cefrLevel}</Badge>
              {book.genres.map((genre) => (
                <Badge key={genre}>{genre}</Badge>
              ))}
              <span className="text-xs text-muted-foreground tabular-nums">
                {book.chapterCount} {t.books.chapterUnit} · {book.wordCount.toLocaleString("en-US")}{" "}
                {t.books.words}
              </span>
            </div>
            <h1 className="mt-3 font-serif text-[2.125rem] leading-tight font-medium text-balance sm:text-5xl">
              {book.title}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {book.titleZh} · {book.author}
              {book.authorZh ? `（${book.authorZh}）` : ""}
            </p>
            <p className="mt-3 leading-relaxed text-pretty text-soft-3">{book.descriptionZh}</p>
          </div>
          {current ? (
            <Button asChild size="lg">
              <Link href={`/books/${book.id}/chapters/${current.id}`}>
                {anyCompleted ? t.books.continueReading : t.books.startReading}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : null}
        </header>
      </div>

      <EntryList>
        {chapters.map((chapter) => (
          <EntryRow
            key={chapter.id}
            href={chapter.locked ? undefined : `/books/${book.id}/chapters/${chapter.id}`}
            className={chapter.locked ? "text-muted-foreground" : undefined}
            meta={
              <span className="text-xs text-muted-foreground tabular-nums">
                {fill(t.books.chapterOf, { i: chapter.sortOrder, n: chapters.length })}
              </span>
            }
            title={chapter.title}
            subtitle={`${chapter.titleZh} · ${chapter.wordCount.toLocaleString("en-US")} ${t.books.words} · ${chapter.estMinutes} ${t.common.minutes}`}
            right={
              chapter.locked ? (
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <Lock className="size-3.5" aria-hidden />
                  {t.books.locked}
                  {/* The unlock rule was a hover-only title attribute —
                      unreachable by keyboard and untouchable on mobile. */}
                  <span className="sr-only">{t.books.lockedNote}</span>
                </span>
              ) : chapter.completed && chapter.best ? (
                <span className="inline-flex items-center gap-1 font-medium text-brand-ink">
                  <Check className="size-4" aria-hidden />
                  {t.reading.bestScore} {chapter.best.score}/{chapter.best.total}
                </span>
              ) : chapter.id === current?.id ? (
                <span className="font-medium text-foreground">
                  {anyCompleted ? t.books.continueReading : t.books.startReading}
                </span>
              ) : null
            }
          />
        ))}
      </EntryList>
    </div>
  );
}
