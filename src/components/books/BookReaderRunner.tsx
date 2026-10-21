"use client";

import { ArrowRight, NotebookPen } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { BookChatMessageVM } from "@/components/books/BookTutorDock";
import { QuestionsForm } from "@/components/exercise/QuestionsForm";
import { SubmitBar } from "@/components/exercise/ExerciseParts";
import { ScoreCard } from "@/components/exercise/ScoreCard";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { SanitizedQuestion } from "@/content/types";
import { submitBookQuiz, type GradedBookQuiz } from "@/lib/actions/books";
import { useAnswerDraft } from "@/components/exercise/useAnswerDraft";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useFlowCounter, useFlowExit } from "@/lib/flow-store";

// Loaded on demand: the tutor prop exists only for premium users with AI
// enabled, so free/keyless readers never download the dock chunk.
const BookTutorDock = dynamic(
  () => import("@/components/books/BookTutorDock").then((m) => m.BookTutorDock),
  { ssr: false },
);

/** Present only for entitled (premium) users with AI enabled — the server
 * page gates the prop, the runner just mounts the dock in reading mode. */
export interface BookTutorProps {
  initialMessages: BookChatMessageVM[];
  remainingToday: number;
  dailyLimit: number;
}

/**
 * Owns the reading → quiz → result flow. The prose (with its inline
 * check-in islands) is server-rendered and passed as children so entering
 * the quiz unmounts it — the end-of-chapter quiz is recall, taken with the
 * book closed. Submitting completes the chapter (any score) and unlocks the
 * next; the refresh runs in its own non-gating transition so the book page
 * and plan pick the completion up (never revalidatePath in actions).
 *
 * The tutor dock rides the reading branch only: the quiz and result
 * branches return early, so entering the quiz unmounts the chat too — the
 * tutor cannot be consulted mid-quiz (ADR 0030).
 */
export function BookReaderRunner({
  bookId,
  chapterId,
  quiz,
  nextChapterId,
  tutor,
  nextStop,
  children,
}: {
  bookId: string;
  chapterId: string;
  quiz: SanitizedQuestion[];
  nextChapterId: string | null;
  tutor?: BookTutorProps;
  /** Server-rendered next-stop CTA when this chapter is a plan stop. */
  nextStop?: React.ReactNode;
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
  const proseRef = useRef<HTMLDivElement>(null);
  const restoreQuiz = useCallback((saved: Record<string, number>) => {
    // Answers only exist mid-quiz, so a restored set reopens the quiz itself.
    setAnswers(saved);
    setMode("quiz");
  }, []);
  useFlowExit("saved", mode === "quiz" && !result && Object.keys(answers).length > 0);
  useFlowCounter(
    mode === "quiz" && !result ? `${Object.keys(answers).length} / ${quiz.length}` : null,
  );
  const draft = useAnswerDraft({
    kind: "book_quiz",
    id: chapterId,
    questions: quiz,
    answers,
    enabled: mode === "quiz" && !result && !pending,
    onRestore: restoreQuiz,
  });

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
        draft.clear();
        setResult(graded);
        startRefresh(() => router.refresh());
        window.scrollTo({ top: 0 });
      } catch {
        setError(true);
      }
    });
  }

  if (result) {
    const wrongCount = result.perQuestion.filter((q) => !q.correct).length;
    return (
      <div className="flex flex-col gap-3.5">
        <ScoreCard score={result.score} total={result.total} />
        <QuestionsForm questions={quiz} answers={answers} graded={result.perQuestion} />
        <div className="mt-2 flex flex-col gap-2.5">
          {nextStop}
          {!nextStop && nextChapterId ? (
            <Button asChild size="lg">
              <Link href={`/books/${bookId}/chapters/${nextChapterId}`}>
                {t.books.nextChapter}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : null}
          {wrongCount > 0 ? (
            <Button asChild variant="ghost" className="text-coral-ink hover:text-coral-ink">
              <Link href="/mistakes">
                <NotebookPen aria-hidden />
                {t.common.reviewWrongCta} · {wrongCount}
              </Link>
            </Button>
          ) : null}
          <div className="flex gap-2.5">
            {nextStop && nextChapterId ? (
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/books/${bookId}/chapters/${nextChapterId}`}>
                  {t.books.nextChapter}
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/books/${bookId}`}>{t.books.backToBook}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "quiz") {
    const answeredCount = Object.keys(answers).length;
    return (
      <section aria-labelledby="book-quiz" className="flex flex-col gap-3.5">
        <div>
          <h2 id="book-quiz" className="font-serif text-2xl font-medium">
            {t.books.chapterQuiz}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.books.quizIntro}</p>
        </div>
        <QuestionsForm
          questions={quiz}
          answers={answers}
          onAnswer={(id, i) => setAnswers((a) => ({ ...a, [id]: i }))}
          // Locked while the submit is in flight: a changed pick mid-request
          // would mint a new idempotency key and could record a second attempt.
          disabled={pending}
        />
        {error ? (
          <Callout variant="error" className="px-4 py-3 text-center text-sm">
            {t.common.submitRetry}
          </Callout>
        ) : null}
        <SubmitBar
          answered={answeredCount}
          total={quiz.length}
          pending={pending}
          onSubmit={submit}
          label={t.common.submit}
        />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div ref={proseRef} className="flex flex-col gap-10">
        {children}
      </div>
      <section
        aria-labelledby="book-quiz-cta"
        className="flex flex-col items-center rounded-xl bg-muted px-6 py-8 text-center"
      >
        <h2 id="book-quiz-cta" className="font-serif text-xl font-medium">
          {t.books.chapterQuiz}
        </h2>
        <p className="mt-1.5 text-sm text-soft-3">{t.books.quizIntro}</p>
        <Button size="lg" className="mt-5" onClick={startQuiz}>
          {t.books.startQuiz}
        </Button>
      </section>
      {tutor ? (
        <BookTutorDock bookId={bookId} chapterId={chapterId} proseRef={proseRef} {...tutor} />
      ) : null}
    </div>
  );
}
