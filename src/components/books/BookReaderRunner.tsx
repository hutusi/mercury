"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { ResultSummary } from "@/components/exercise/ResultSummary";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { SanitizedQuestion } from "@/content/types";
import { submitBookQuiz, type GradedBookQuiz } from "@/lib/actions/books";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";

/**
 * Owns the reading → quiz → result flow. The prose (with its inline
 * check-in islands) is server-rendered and passed as children so entering
 * the quiz unmounts it — the end-of-chapter quiz is recall, taken with the
 * book closed. Submitting completes the chapter (any score) and unlocks the
 * next; the refresh runs in its own non-gating transition so the book page
 * and plan pick the completion up (never revalidatePath in actions).
 */
export function BookReaderRunner({
  bookId,
  chapterId,
  quiz,
  nextChapterId,
  children,
}: {
  bookId: string;
  chapterId: string;
  quiz: SanitizedQuestion[];
  nextChapterId: string | null;
  children: React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<"reading" | "quiz">("reading");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GradedBookQuiz | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [, startRefresh] = useTransition();
  const startedAt = useRef(0);
  const requestRef = useRef<LogicalRequestId | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function startQuiz() {
    setMode("quiz");
    window.scrollTo({ top: 0 });
  }

  function submit() {
    setError(false);
    startTransition(async () => {
      try {
        // A retry after a lost response reuses the same id (answers
        // unchanged), so the server replays instead of double-recording.
        const request = requestIdForInput(requestRef.current, JSON.stringify(answers));
        requestRef.current = request;
        const graded = await submitBookQuiz({
          requestId: request.requestId,
          bookId,
          chapterId,
          answers,
          durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
        });
        requestRef.current = null;
        setResult(graded);
        startRefresh(() => router.refresh());
        window.scrollTo({ top: 0 });
      } catch {
        setError(true);
      }
    });
  }

  if (result) {
    return (
      <ResultSummary
        questions={quiz}
        answers={answers}
        graded={result.perQuestion}
        score={result.score}
        total={result.total}
      >
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/books/${bookId}`}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {t.books.backToBook}
          </Link>
          {nextChapterId && (
            <Button asChild size="lg" className="h-11">
              <Link href={`/books/${bookId}/chapters/${nextChapterId}`}>
                {t.books.nextChapter} →
              </Link>
            </Button>
          )}
        </div>
      </ResultSummary>
    );
  }

  if (mode === "quiz") {
    const answeredCount = Object.keys(answers).length;
    return (
      <div className="space-y-6">
        <div className="border-y border-border py-4">
          <SectionLabel as="h2">{t.books.chapterQuiz}</SectionLabel>
        </div>
        <QuestionsForm
          questions={quiz}
          answers={answers}
          onAnswer={(id, i) => setAnswers((a) => ({ ...a, [id]: i }))}
        />
        {error && (
          <Callout variant="error" className="p-3 text-center text-sm">
            {t.common.submitRetry}
          </Callout>
        )}
        <Button
          onClick={submit}
          disabled={pending || answeredCount < quiz.length}
          size="lg"
          className="h-11 w-full disabled:cursor-not-allowed"
        >
          {pending ? t.common.loading : `${t.common.submit} (${answeredCount}/${quiz.length})`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {children}
      <section className="border-y border-border py-6 text-center">
        <SectionLabel as="h2">{t.books.chapterQuiz}</SectionLabel>
        <p className="mt-3 text-sm text-muted-foreground">{t.books.quizIntro}</p>
        <Button size="lg" className="mt-4 h-11" onClick={startQuiz}>
          {t.books.startQuiz}
        </Button>
      </section>
    </div>
  );
}
