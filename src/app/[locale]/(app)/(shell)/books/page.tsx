import { Check } from "lucide-react";
import type { CefrLevel } from "@/content/types";
import { EmptyState } from "@/components/typography/EmptyState";
import { EntryHeader } from "@/components/typography/EntryHeader";
import { EntryList, EntryRow } from "@/components/typography/EntryList";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Badge } from "@/components/ui/badge";
import { groupBooksByBand, recommendedBands } from "@/lib/book-core";
import { getDict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/fill";
import { listBooksForUser } from "@/lib/queries/books";
import { getLearnerProfile } from "@/lib/queries/profile";
import { requireOnboarded } from "@/lib/settings";

export default async function BooksPage() {
  const [{ user }, t] = await Promise.all([requireOnboarded(), getDict()]);

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
    <div className="flex flex-col gap-8">
      <EntryHeader
        title={t.nav.books}
        ipa={t.entry.booksIpa}
        pos={t.entry.booksPos}
        gloss={t.books.subtitle}
      />

      {groups.map(({ band, books: bandBooks }) => (
        <section key={band} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <SectionLabel as="h2">
              {band} · {bandLabels[band]}
            </SectionLabel>
            {recommended.has(band) ? (
              <Badge variant="accent">{t.books.recommendedStart}</Badge>
            ) : null}
          </div>
          <EntryList>
            {bandBooks.map((book) => {
              const finished = book.completedChapters >= book.chapterCount;
              const started = book.completedChapters > 0;
              return (
                <EntryRow
                  key={book.id}
                  href={`/books/${book.id}`}
                  meta={book.genres.map((genre) => (
                    <Badge key={genre}>{genre}</Badge>
                  ))}
                  title={book.title}
                  subtitle={`${book.titleZh} · ${book.author} · ${book.chapterCount} ${t.books.chapterUnit} · ${book.wordCount.toLocaleString("en-US")} ${t.books.words}`}
                  right={
                    finished ? (
                      <span className="inline-flex items-center gap-1 font-medium text-brand-ink">
                        <Check className="size-4" aria-hidden />
                        {t.books.finished}
                      </span>
                    ) : started ? (
                      <span className="flex flex-col items-end gap-1.5">
                        <span className="text-xs">
                          {fill(t.books.progress, {
                            d: book.completedChapters,
                            n: book.chapterCount,
                          })}
                        </span>
                        <span
                          aria-hidden
                          className="h-1 w-20 overflow-hidden rounded-full bg-track"
                        >
                          <span
                            className="block h-full rounded-full bg-brand"
                            style={{
                              width: `${(book.completedChapters / book.chapterCount) * 100}%`,
                            }}
                          />
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs">{t.books.notStarted}</span>
                    )
                  }
                />
              );
            })}
          </EntryList>
        </section>
      ))}
      {books.length === 0 ? <EmptyState>{t.common.empty}</EmptyState> : null}
    </div>
  );
}
