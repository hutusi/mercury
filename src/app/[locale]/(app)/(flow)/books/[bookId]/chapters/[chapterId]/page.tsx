import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { notFound } from "next/navigation";
import { isAiEnabled } from "@/lib/ai/client";
import { BookReaderRunner, type BookTutorProps } from "@/components/books/BookReaderRunner";
import { CheckInCard } from "@/components/books/CheckInCard";
import { NextStopButton } from "@/components/flow/NextStopButton";
import { GlossedText } from "@/components/reading/GlossedText";
import { PassageText } from "@/components/typography/PassageText";
import { Callout } from "@/components/ui/callout";
import { buildGlossPattern, segmentGlossText } from "@/lib/gloss-core";
import { fill } from "@/lib/i18n/fill";
import { getReviewedGlossesToday } from "@/lib/queries/vocab";
import { estimateChapterMinutes } from "@/lib/book-core";
import { getDict, localeRedirect } from "@/lib/i18n";
import { getBookChatPageData } from "@/lib/queries/book-chat";
import { getBookChapterForReader } from "@/lib/queries/books";
import { getTierForUser } from "@/lib/queries/membership";
import { requireOnboarded } from "@/lib/settings";

// Makes a runtime AI call (directly or via server actions): the provider
// budget plus claim/publish headroom, inside the lease stale window
// (src/lib/ai/budget.ts).
export const maxDuration = 115;

export default async function BookChapterPage({
  params,
}: {
  params: Promise<{ bookId: string; chapterId: string }>;
}) {
  const [{ user, timeZone }, { bookId, chapterId }, t] = await Promise.all([
    requireOnboarded(),
    params,
    getDict(),
  ]);

  // The book tutor is a premium hard gate (ADR 0030), absent keyless — on a
  // keyless server not even the tier read runs on this hottest of pages.
  const aiEnabled = isAiEnabled();
  // The query sanitizes both question groups — no answers can reach the DOM.
  const [data, tier, flow, glosses] = await Promise.all([
    getBookChapterForReader(user.id, bookId, chapterId),
    aiEnabled ? getTierForUser(user.id) : null,
    getFlowContext(user.id, timeZone, "book_chapter", chapterId),
    getReviewedGlossesToday(user.id, timeZone),
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

  // Words reviewed on flashcards today, underlined where the chapter uses
  // them; the legend shows only when something matched.
  const glossPattern = buildGlossPattern(glosses);
  const showLegend = chapter.sections.some((section) =>
    segmentGlossText(section.text, glossPattern).some((segment) => typeof segment !== "string"),
  );

  return (
    <>
      <FlowHeader context={flow} hubHref={`/books/${book.id}`} />
      <FlowBody>
        <div className="mx-auto max-w-[42.5rem]">
          <p className="text-[0.8125rem] text-muted-foreground tabular-nums">
            {book.title} ·{" "}
            {fill(t.books.chapterOf, { i: chapter.sortOrder, n: chapter.chapterCount })}
          </p>
          <h1 className="mt-2 font-serif text-[1.875rem] leading-tight font-medium text-balance sm:text-4xl">
            {chapter.title}
          </h1>
          <p className="mt-2 font-serif text-base text-muted-foreground">
            {chapter.titleZh}
            <span className="font-sans text-[0.8125rem] tabular-nums">
              {" "}
              · {chapter.wordCount.toLocaleString("en-US")} {t.books.words} ·{" "}
              {estimateChapterMinutes(chapter.wordCount, chapter.quiz.length)} {t.common.minutes}
            </span>
          </p>
          {chapter.summaryZh ? (
            <p className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm leading-relaxed text-pretty text-soft-3">
              {chapter.summaryZh}
            </p>
          ) : null}
          {showLegend ? (
            <Callout
              variant="accent"
              className="mt-4 flex items-center gap-2.5 px-3.5 py-2.5 text-[0.8125rem] leading-normal"
            >
              <span
                aria-hidden
                className="w-[1.375rem] shrink-0 border-b-2 border-dotted border-brand"
              />
              {t.reading.legend}
            </Callout>
          ) : null}

          <div className="mt-8">
            <BookReaderRunner
              bookId={book.id}
              chapterId={chapter.id}
              quiz={chapter.quiz}
              nextChapterId={nextChapterId}
              tutor={tutor}
              nextStop={
                flow.mode === "plan" ? <NextStopButton context={flow} className="w-full" /> : null
              }
            >
              {chapter.sections.map((section) => (
                <section key={section.id} className="flex flex-col gap-6">
                  <PassageText>
                    <GlossedText text={section.text} glosses={glosses} />
                  </PassageText>
                  {section.checkIn ? (
                    <CheckInCard
                      bookId={book.id}
                      chapterId={chapter.id}
                      question={section.checkIn}
                    />
                  ) : null}
                </section>
              ))}
            </BookReaderRunner>
          </div>
        </div>
      </FlowBody>
    </>
  );
}
