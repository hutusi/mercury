"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { retestVocabMistake } from "@/lib/actions/mistakes";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import type { VocabMistakeVM } from "@/lib/mistakes";

/**
 * One wrong vocab word, re-tested with a freshly regenerated question (the
 * original quiz's distractors were never stored). Same integrity model as
 * QuizRunner: options carry word ids and grade by id equality client-side;
 * the server action re-grades and persists the clear.
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
  const [clearedNow, setClearedNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const cleared = mistake.cleared || clearedNow;
  const quiz = mistake.quiz;
  const date = new Date(mistake.lastWrongAt).toLocaleDateString(
    locale === "zh" ? "zh-CN" : "en-US",
    { month: "short", day: "numeric" },
  );

  function pick(optionWordId: string) {
    if (picked || cleared) return;
    setPicked(optionWordId);
    setError(null);
    const correct = optionWordId === mistake.wordId;
    startTransition(async () => {
      try {
        const result = await retestVocabMistake({
          wordId: mistake.wordId,
          chosenWordId: optionWordId,
        });
        if (result.correct) {
          setClearedNow(true);
          onCleared?.();
        }
      } catch {
        setError(t.exams.submitFailed);
        setPicked(null);
        return;
      }
      if (!correct) return; // stays wrong; tryAgain re-enables below
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
          {mistake.cleared || !quiz ? (
            <p className={`text-sm ${cleared ? "text-muted-foreground" : ""}`}>
              <span className="font-medium">{mistake.headword}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              {mistake.translationZh}
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-serif text-lg font-medium">{quiz.prompt}</span>
                <span className="ml-3 text-xs text-muted-foreground">
                  {quiz.direction === "en2zh" ? t.vocab.quizPickMeaning : t.vocab.quizPickWord}
                </span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {quiz.options.map((option) => {
                  const isCorrect = option.wordId === mistake.wordId;
                  const isPicked = picked === option.wordId;
                  const revealed = picked !== null;
                  return (
                    <button
                      key={option.wordId}
                      type="button"
                      disabled={revealed}
                      onClick={() => pick(option.wordId)}
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
              {picked !== null && picked !== mistake.wordId && (
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-cinnabar">{t.mistakes.retestWrong}</p>
                  <Button variant="outline" size="sm" onClick={() => setPicked(null)}>
                    {t.common.tryAgain}
                  </Button>
                </div>
              )}
              {clearedNow && (
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Check className="size-4" aria-hidden />
                  {t.mistakes.retestCorrect}
                </p>
              )}
              {error && <p className="text-sm font-medium text-cinnabar">{error}</p>}
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
