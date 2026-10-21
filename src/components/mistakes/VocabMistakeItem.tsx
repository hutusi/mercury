"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Callout } from "@/components/ui/callout";
import { answerVocabMistakeRetest, createVocabMistakeRetest } from "@/lib/actions/mistakes";
import { fill } from "@/lib/i18n/fill";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { VocabMistakeVM } from "@/lib/mistakes";
import type { QuizQuestion } from "@/lib/vocab-quiz-core";
import { AnswerOption, OPTION_GRID, type OptionState } from "@/components/exercise/AnswerOption";
import { MistakeCardShell, RetestButton, RetestOutcome, type CardMeta } from "./RetestParts";

/**
 * One wrong vocab word, re-tested through a one-question server-owned quiz
 * session. Opaque ids reveal nothing until the server grades the pick; a
 * retry asks for a fresh session (new distractors), never the same one.
 */
export function VocabMistakeItem({
  mistake,
  meta,
  onCleared,
  onDismiss,
}: {
  mistake: VocabMistakeVM;
  meta: CardMeta;
  onCleared: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  const [session, setSession] = useState<{ sessionId: string; question: QuizQuestion } | null>(
    null,
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ correct: boolean; correctOptionId: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const optionsRef = useRef<HTMLDivElement>(null);
  const quiz = session?.question ?? null;

  useEffect(() => {
    if (quiz && !outcome) optionsRef.current?.querySelector("button")?.focus();
  }, [quiz, outcome]);

  function loadQuiz() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createVocabMistakeRetest(mistake.wordId);
        if (!created.sessionId || !created.questions[0]) throw new Error("No quiz available");
        setSession({ sessionId: created.sessionId, question: created.questions[0] });
        setPicked(null);
        setOutcome(null);
      } catch {
        setError(t.common.submitRetry);
      }
    });
  }

  function pick(optionId: string) {
    if (picked || pending || !session) return;
    setPicked(optionId);
    setError(null);
    startTransition(async () => {
      try {
        const answer = await answerVocabMistakeRetest({
          sessionId: session.sessionId,
          questionId: session.question.id,
          optionId,
        });
        if (!answer.ok) {
          // The mistake changed (or the session lapsed) after this retest was
          // issued: discard the obsolete question and offer a fresh retest.
          setSession(null);
          setPicked(null);
          setError(t.mistakes.retestStale);
          return;
        }
        setOutcome(answer.result);
        if (answer.result.correct) onCleared();
      } catch {
        setPicked(null);
        setError(t.common.submitRetry);
      }
    });
  }

  function optionState(id: string): OptionState {
    if (!outcome) return picked === id ? "picked" : "idle";
    if (id === outcome.correctOptionId) return "correct";
    return id === picked ? "wrong" : "muted";
  }

  return (
    <MistakeCardShell kind="vocab_quiz" meta={meta} highlighted={outcome?.correct}>
      {quiz ? (
        <>
          <p className="mt-2 text-[0.8125rem] text-muted-foreground">
            {quiz.direction === "en2zh" ? t.vocab.quizPickMeaning : t.vocab.quizPickWord}
          </p>
          <p className="mt-1 font-serif text-[1.375rem] leading-snug font-medium">{quiz.prompt}</p>
          <div
            ref={optionsRef}
            role="group"
            aria-label={quiz.prompt}
            className={`mt-3.5 ${OPTION_GRID}`}
          >
            {quiz.options.map((option) => (
              <AnswerOption
                key={option.id}
                state={optionState(option.id)}
                disabled={pending || Boolean(outcome)}
                onClick={() => pick(option.id)}
              >
                {option.text}
              </AnswerOption>
            ))}
          </div>
          {outcome ? (
            <RetestOutcome
              correct={outcome.correct}
              askHref={`/tutor?ask=${encodeURIComponent(fill(t.mistakes.askWord, { w: mistake.headword }))}`}
              pending={pending}
              onRetry={loadQuiz}
              onContinue={onDismiss}
            />
          ) : null}
        </>
      ) : (
        <>
          {/* The meaning stays hidden until it's earned back — the retest may
              ask for it. The cleared list shows both. */}
          <p className="mt-2 font-serif text-[1.375rem] leading-snug font-medium">
            {mistake.headword}
          </p>
          <div className="mt-3">
            <RetestButton onClick={loadQuiz} pending={pending} />
          </div>
        </>
      )}
      {error ? (
        <Callout variant="error" className="mt-3 px-3 py-2 text-sm">
          {error}
        </Callout>
      ) : null}
    </MistakeCardShell>
  );
}
