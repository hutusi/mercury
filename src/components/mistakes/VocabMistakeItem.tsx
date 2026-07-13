"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { answerVocabMistakeRetest, createVocabMistakeRetest } from "@/lib/actions/mistakes";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import type { VocabMistakeVM } from "@/lib/mistakes";
import type { QuizQuestion } from "@/lib/vocab-quiz-core";

/**
 * One wrong vocab word, re-tested through a one-question server-owned quiz
 * session. Opaque ids reveal nothing until the server grades the selection.
 */
export function VocabMistakeItem({
  mistake,
  onCleared,
}: {
  mistake: VocabMistakeVM;
  onCleared?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [picked, setPicked] = useState<string | null>(null);
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null);
  const [session, setSession] = useState<{ sessionId: string; question: QuizQuestion } | null>(
    null,
  );
  const [clearedNow, setClearedNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cleared = mistake.cleared || clearedNow;
  const quiz = session?.question ?? null;
  const date = new Date(mistake.lastWrongAt).toLocaleDateString(
    locale === "zh" ? "zh-CN" : "en-US",
    { month: "short", day: "numeric" },
  );

  function loadQuiz() {
    if (pending || cleared) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createVocabMistakeRetest(mistake.wordId);
        if (!created.sessionId || !created.questions[0]) throw new Error("No quiz available");
        setSession({ sessionId: created.sessionId, question: created.questions[0] });
        setPicked(null);
        setCorrectOptionId(null);
      } catch {
        setError(t.exams.submitFailed);
      }
    });
  }

  function pick(optionId: string) {
    if (picked || cleared || pending || !session) return;
    setError(null);
    startTransition(async () => {
      try {
        const outcome = await answerVocabMistakeRetest({
          sessionId: session.sessionId,
          questionId: session.question.id,
          optionId,
        });
        if (!outcome.ok) {
          // The mistake changed (or the session lapsed) after this retest was
          // issued: discard the obsolete question and offer a fresh retest.
          setSession(null);
          setPicked(null);
          setCorrectOptionId(null);
          setError(t.mistakes.retestStale);
          return;
        }
        setPicked(optionId);
        setCorrectOptionId(outcome.result.correctOptionId);
        if (outcome.result.correct) {
          setClearedNow(true);
          onCleared?.();
        }
      } catch {
        setError(t.exams.submitFailed);
      }
    });
  }

  return (
    <li className="border-b border-border py-3 last:border-0">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 shrink-0">
          {cleared ? <Check className="size-4" /> : <X className="size-4 text-cinnabar" />}
        </span>
        <div className="min-w-0 flex-1">
          {/* Key on the server-cleared flag, not clearedNow: a just-cleared item
              keeps its revealed options + confirmation instead of collapsing. */}
          {mistake.cleared ? (
            <p className={`text-sm ${cleared ? "text-muted-foreground" : ""}`}>
              <span className="font-medium">{mistake.headword}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              {mistake.translationZh}
            </p>
          ) : quiz ? (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-serif text-lg font-medium">{quiz.prompt}</span>
                <span className="ml-3 text-xs text-muted-foreground">
                  {quiz.direction === "en2zh" ? t.vocab.quizPickMeaning : t.vocab.quizPickWord}
                </span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={quiz.prompt}>
                {quiz.options.map((option) => {
                  const isCorrect = option.id === correctOptionId;
                  const isPicked = picked === option.id;
                  const revealed = picked !== null;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={revealed}
                      onClick={() => pick(option.id)}
                      aria-pressed={isPicked}
                      className={`border px-3 py-2 text-left text-sm transition-colors ${
                        revealed && isCorrect
                          ? "border-foreground bg-muted font-medium"
                          : revealed && isPicked
                            ? "border-cinnabar bg-cinnabar/10 text-cinnabar"
                            : "border-border hover:border-input hover:bg-muted/50"
                      } disabled:cursor-default`}
                    >
                      {option.text}
                      {revealed && isCorrect && (
                        <Check className="ml-1.5 inline size-3.5" aria-hidden />
                      )}
                      {revealed && isPicked && !isCorrect && (
                        <X className="ml-1.5 inline size-3.5" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
              {picked !== null && picked !== correctOptionId && (
                <div className="flex items-center gap-3" role="status">
                  <p className="text-sm font-medium text-cinnabar">{t.mistakes.retestWrong}</p>
                  <Button variant="outline" size="sm" onClick={loadQuiz} disabled={pending}>
                    {t.common.tryAgain}
                  </Button>
                </div>
              )}
              {clearedNow && (
                <p role="status" className="flex items-center gap-1.5 text-sm font-medium">
                  <Check className="size-4" aria-hidden />
                  {t.mistakes.retestCorrect}
                </p>
              )}
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">{mistake.headword}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                {mistake.translationZh}
              </p>
              <Button variant="outline" size="sm" onClick={loadQuiz} disabled={pending}>
                {pending ? t.common.loading : t.mistakes.retest}
              </Button>
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{t.vocab.quiz}</Badge>
            <span className="font-mono tabular-nums">
              {t.mistakes.wrongLabel} ×{mistake.wrongCount}
            </span>
            <span>
              {t.mistakes.lastWrong} {date}
            </span>
          </p>
        </div>
      </div>
    </li>
  );
}
