"use client";

import { useState } from "react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import type { SanitizedQuestion } from "@/content/types";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * Owns the reading → quiz mode switch. The prose (with its inline check-in
 * islands) is server-rendered and passed as children so entering the quiz
 * can unmount it — the end-of-chapter quiz is recall, taken with the book
 * closed. The quiz flow itself lands with the submit service; until then
 * the start button is disabled.
 */
export function BookReaderRunner({
  children,
}: {
  bookId: string;
  chapterId: string;
  quiz: SanitizedQuestion[];
  nextChapterId: string | null;
  children: React.ReactNode;
}) {
  const t = useT();
  const [mode] = useState<"reading" | "quiz">("reading");

  return (
    <div className="space-y-10">
      {mode === "reading" && (
        <>
          {children}
          <section className="border-y border-border py-6 text-center">
            <SectionLabel as="h2">{t.books.chapterQuiz}</SectionLabel>
            <p className="mt-3 text-sm text-muted-foreground">{t.books.quizIntro}</p>
            <Button size="lg" className="mt-4 h-11" disabled>
              {t.books.startQuiz}
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
