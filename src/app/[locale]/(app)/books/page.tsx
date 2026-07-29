import { Check } from "lucide-react";
import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { Badge } from "@/components/ui/badge";
import { getDict } from "@/lib/i18n";
import { listBooksForUser } from "@/lib/queries/books";
import { requireOnboarded } from "@/lib/settings";

export default async function BooksPage() {
  const { user } = await requireOnboarded();
  const t = await getDict();

  // The library is track-agnostic by design (ADR 0024) — no track filter.
  const books = await listBooksForUser(user.id);

  return (
    <div className="space-y-8">
      <EntryHeader
        title={t.nav.books}
        ipa={t.entry.booksIpa}
        pos={t.entry.booksPos}
        gloss={t.books.subtitle}
      />

      <EntryList>
        {books.map((book) => (
          <EntryRow
            key={book.id}
            href={`/books/${book.id}`}
            meta={
              <>
                <Badge variant="outline">{book.cefrLevel}</Badge>
                {book.genres.map((genre) => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </>
            }
            title={book.title}
            subtitle={`${book.titleZh} · ${book.author}`}
            right={
              <div className="text-right">
                <p className="font-mono text-2xs text-muted-foreground">
                  {book.chapterCount} {t.books.chapterUnit} ·{" "}
                  {book.wordCount.toLocaleString("en-US")} {t.books.words}
                </p>
                {book.completedChapters >= book.chapterCount ? (
                  <p className="mt-1 flex items-center justify-end gap-1 font-mono text-xs font-medium text-foreground tabular-nums">
                    <Check className="size-3.5" aria-hidden />
                    {t.books.finished}
                  </p>
                ) : book.completedChapters > 0 ? (
                  <p className="mt-1 font-mono text-xs font-medium text-foreground tabular-nums">
                    {book.completedChapters}/{book.chapterCount} · {t.books.chaptersDone}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground/70">{t.books.notStarted}</p>
                )}
              </div>
            }
          />
        ))}
      </EntryList>
      {books.length === 0 && <EmptyState>{t.common.empty}</EmptyState>}
    </div>
  );
}
