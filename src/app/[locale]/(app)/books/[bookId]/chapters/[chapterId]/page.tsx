import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { isAiEnabled } from "@/lib/ai/client";
import { BookReaderRunner, type BookTutorProps } from "@/components/books/BookReaderRunner";
import { CheckInCard } from "@/components/books/CheckInCard";
import { PassageText } from "@/components/typography/PassageText";
import { estimateChapterMinutes } from "@/lib/book-core";
import { getDict, localeRedirect } from "@/lib/i18n";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { getBookChatPageData } from "@/lib/queries/book-chat";
import { getBookChapterForReader } from "@/lib/queries/books";
import { getTierForUser } from "@/lib/queries/membership";
import { requireOnboarded } from "@/lib/settings";

export default async function BookChapterPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  const { user } = await requireOnboarded();
  const { bookId, chapterId } = await params;
  const t = await getDict();

  // The book tutor is a premium hard gate (ADR 0030), absent keyless — on a
  // keyless server not even the tier read runs on this hottest of pages.
  const aiEnabled = isAiEnabled();
  // The query sanitizes both question groups — no answers can reach the DOM.
  const [data, tier] = await Promise.all([
    getBookChapterForReader(user.id, bookId, chapterId),
    aiEnabled ? getTierForUser(user.id) : null,
  ]);
  if (!data) notFound();
  // Locked chapters are server-enforced; deep links bounce to the book page.
  if (data.status === "locked") return localeRedirect(`/books/${bookId}`);

  const { book, chapter, nextChapterId } = data;

  let tutor: BookTutorProps | undefined;
  if (aiEnabled && tier === "premium") {
    const chat = await getBookChatPageData(user.id, book.id);
    if (chat?.entitled) {
      tutor = {
        initialMessages: chat.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
        remainingToday: chat.remainingToday,
        dailyLimit: chat.dailyLimit,
      };
    }
  }

  return (
    <div className="mx-auto max-w-prose space-y-8">
      <div>
        <Link
          href={`/books/${book.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {book.title}
        </Link>
        <p className="mt-4 font-mono text-2xs font-medium tracking-label text-muted-foreground uppercase tabular-nums">
          {String(chapter.sortOrder).padStart(2, "0")} / {chapter.chapterCount}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          {chapter.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {chapter.titleZh} · {chapter.wordCount.toLocaleString("en-US")} {t.books.words} ·{" "}
          {estimateChapterMinutes(chapter.wordCount, chapter.quiz.length)} {t.common.minutes}
        </p>
        {chapter.summaryZh && (
          <p className="mt-3 border-l-2 border-border pl-3 text-sm text-pretty text-muted-foreground">
            {chapter.summaryZh}
          </p>
        )}
      </div>

      <BookReaderRunner
        bookId={book.id}
        chapterId={chapter.id}
        quiz={chapter.quiz}
        nextChapterId={nextChapterId}
        tutor={tutor}
      >
        {chapter.sections.map((section) => (
          <section key={section.id} className="space-y-6">
            <PassageText className="space-y-4">{section.text}</PassageText>
            {section.checkIn && (
              <CheckInCard bookId={book.id} chapterId={chapter.id} question={section.checkIn} />
            )}
          </section>
        ))}
      </BookReaderRunner>
    </div>
  );
}
