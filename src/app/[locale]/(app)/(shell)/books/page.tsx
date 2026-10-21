import { Check } from "lucide-react";
import type { CefrLevel } from "@/content/types";
import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Badge } from "@/components/ui/badge";
import { groupBooksByBand, recommendedBands } from "@/lib/book-core";
import { getDict } from "@/lib/i18n";
import { listBooksForUser } from "@/lib/queries/books";
import { getLearnerProfile } from "@/lib/queries/profile";
import { requireOnboarded } from "@/lib/settings";

export default async function BooksPage() {
  const { user } = await requireOnboarded();
  const t = await getDict();

  // The library is track-agnostic by design (ADR 0024) — no track filter.
  // getLearnerProfile is request-cached and already warmed by requireOnboarded.
  const [books, profile] = await Promise.all([
    listBooksForUser(user.id),
    getLearnerProfile(user.id),
  ]);

  // Ladder guidance, never gates: bands are visual grouping plus a starting
  // hint from the learner's self-rating — every book stays clickable.
  const groups = groupBooksByBand(books);
  const recommended = new Set(recommendedBands(profile?.selfRatedLevel ?? null));
  // The dictionary is deliberately flat (two levels), so assemble the map here.
  const bandLabels: Record<CefrLevel, string> = {
    A1: t.books.bandA1,
    A2: t.books.bandA2,
    B1: t.books.bandB1,
    B2: t.books.bandB2,
    C1: t.books.bandC1,
    C2: t.books.bandC2,
  };

  return (
    <div className="space-y-8">
      <EntryHeader
        title={t.nav.books}
        ipa={t.entry.booksIpa}
        pos={t.entry.booksPos}
        gloss={t.books.subtitle}
      />

      {groups.map(({ band, books: bandBooks }) => (
        <section key={band} className="space-y-2">
          <div className="flex items-center gap-2">
            <SectionLabel as="h2">
              {band} · {bandLabels[band]}
            </SectionLabel>
            {recommended.has(band) && <Badge variant="outline">{t.books.recommendedStart}</Badge>}
          </div>
          <EntryList>
            {bandBooks.map((book) => (
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
        </section>
      ))}
      {books.length === 0 && <EmptyState>{t.common.empty}</EmptyState>}
    </div>
  );
}
