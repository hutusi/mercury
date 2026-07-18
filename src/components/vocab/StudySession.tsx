"use client";

import { Sparkles, Volume2 } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { gradeCard } from "@/lib/actions/vocab";
import { useT } from "@/lib/i18n/LocaleProvider";
import { createWordSpeaker, ttsSupported, type WordSpeaker } from "@/lib/speech";
import { previewInterval, type ReviewGrade, type SrsState } from "@/lib/srs";

export interface StudyCardData {
  wordId: string;
  headword: string;
  ipa: string;
  pos: string;
  definitionEn: string;
  translationZh: string;
  exampleEn: string;
  exampleZh: string;
  isNew: boolean;
  srs: SrsState;
}

const QUIET_GRADE_CLS = "border border-border bg-background text-foreground hover:bg-muted";

export function StudySession({ cards }: { cards: StudyCardData[] }) {
  const t = useT();
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const speakerRef = useRef<WordSpeaker | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mounted-gate: speech APIs only exist client-side
    setMounted(true);
    speakerRef.current = createWordSpeaker();
    return () => speakerRef.current?.stop();
  }, []);

  const card = queue[index];

  const grade = useCallback(
    (g: ReviewGrade) => {
      if (!card || pending) return;
      setError(null);
      speakerRef.current?.stop();
      startTransition(async () => {
        try {
          const result = await gradeCard({ wordId: card.wordId, grade: g });
          setReviewed((n) => n + 1);
          // "Forgot" re-queues the card with its post-lapse scheduler state so
          // the interval hints stay truthful on the second pass.
          setQueue((q) => (g === 1 ? [...q, { ...card, isNew: false, srs: result.srs }] : q));
          setFlipped(false);
          setIndex((i) => i + 1);
        } catch {
          // Keep the card in place so the grade can be retried.
          setError(t.exams.submitFailed);
        }
      });
    },
    [card, pending, t],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!flipped || pending || e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const map: Record<string, ReviewGrade> = { "1": 1, "2": 3, "3": 4, "4": 5 };
      const g = map[e.key];
      if (g === undefined) return;
      e.preventDefault();
      grade(g);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flipped, pending, grade]);

  const canSpeak = mounted && ttsSupported();

  if (!card) {
    return (
      <div className="mx-auto max-w-md border border-border p-10 text-center">
        <p className="flex justify-center" aria-hidden>
          <Sparkles className="size-6" />
        </p>
        <h2 className="mt-4 font-serif text-2xl font-medium">{t.vocab.sessionDone}</h2>
        <p className="mt-2 text-muted-foreground">
          {t.vocab.reviewedCount}: {reviewed}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/vocabulary">{t.common.back}</Link>
          </Button>
          <Button asChild>
            <Link href="/vocabulary/quiz">{t.vocab.startQuiz}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // The teacher's-pen scale: "forgot" is the one red mark; the pass grades are
  // identical quiet ink — the interval hint under each label says what it does.
  const gradeButtons: { grade: ReviewGrade; shortcut: string; label: string; cls: string }[] = [
    {
      grade: 1,
      shortcut: "1",
      label: t.vocab.again,
      cls: "bg-cinnabar text-cinnabar-foreground hover:bg-cinnabar/90",
    },
    { grade: 3, shortcut: "2", label: t.vocab.hard, cls: QUIET_GRADE_CLS },
    { grade: 4, shortcut: "3", label: t.vocab.good, cls: QUIET_GRADE_CLS },
    { grade: 5, shortcut: "4", label: t.vocab.easy, cls: QUIET_GRADE_CLS },
  ];

  function hintLabel(g: ReviewGrade): string {
    const p = previewInterval(card.srs, g);
    return `${p.value} ${p.unit === "minutes" ? t.vocab.intervalMinutesUnit : t.vocab.intervalDaysUnit}`;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between font-mono text-sm text-muted-foreground tabular-nums">
        <span>
          {index + 1} / {queue.length}
        </span>
        <span>
          {t.vocab.reviewedCount}: {reviewed}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={t.vocab.sessionProgress}
        aria-valuemin={0}
        aria-valuemax={queue.length}
        aria-valuenow={index}
        className="h-1 overflow-hidden bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>

      {/* The flashcard is a full dictionary entry. The frame stays non-interactive
          so the speaker buttons can be siblings of the flip button, never nested. */}
      <div className="relative border border-border bg-background transition-colors hover:border-input">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-expanded={flipped}
          aria-controls="study-card-answer"
          className={`block w-full cursor-pointer p-8 text-center outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${flipped ? "" : "min-h-72"}`}
        >
          {card.isNew && (
            <Badge variant="accent" className="mb-3">
              {t.vocab.fresh}
            </Badge>
          )}
          <p className="font-serif text-5xl font-medium tracking-tight">{card.headword}</p>
          <p className="mt-3 font-serif text-muted-foreground italic">
            {card.ipa} · {card.pos}
          </p>
          {!flipped && <p className="mt-8 text-sm text-muted-foreground/70">{t.vocab.flipHint}</p>}
        </button>

        {canSpeak && (
          <button
            type="button"
            onClick={() => speakerRef.current?.speak(card.headword)}
            aria-label={t.vocab.speakWord}
            className="absolute top-3 right-3 flex size-9 items-center justify-center text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span aria-hidden>
              <Volume2 className="size-5" />
            </span>
          </button>
        )}

        {flipped && (
          <div
            id="study-card-answer"
            className="space-y-4 border-t border-border px-8 pt-6 pb-8 text-left"
          >
            <p className="text-center font-serif text-2xl font-medium">{card.translationZh}</p>
            <p className="text-center text-sm text-muted-foreground">{card.definitionEn}</p>
            <div className="bg-muted p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-serif font-medium text-foreground/90">{card.exampleEn}</p>
                {canSpeak && (
                  <button
                    type="button"
                    onClick={() => speakerRef.current?.speak(card.exampleEn)}
                    aria-label={t.vocab.speakExample}
                    className="shrink-0 text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span aria-hidden>
                      <Volume2 className="size-4" />
                    </span>
                  </button>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">{card.exampleZh}</p>
            </div>
          </div>
        )}
      </div>

      {flipped && (
        <div className="grid grid-cols-4 gap-2">
          {gradeButtons.map((b) => (
            <button
              key={b.grade}
              type="button"
              onClick={() => grade(b.grade)}
              disabled={pending}
              aria-keyshortcuts={b.shortcut}
              aria-describedby={`grade-${b.grade}-interval`}
              className={`px-3 py-3 text-sm font-medium outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 ${b.cls}`}
            >
              {b.label}
              {/* aria-hidden keeps each button's accessible name exactly its label;
                  the aria-describedby reference still surfaces the hint as the
                  button's description (directly referenced hidden nodes count). */}
              <span
                aria-hidden
                id={`grade-${b.grade}-interval`}
                className={`mt-1 block font-mono text-xs tabular-nums ${
                  b.grade === 1 ? "text-cinnabar-foreground/80" : "text-muted-foreground"
                }`}
              >
                {hintLabel(b.grade)}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <Callout variant="error" className="p-3 text-center text-sm">
          {error}
        </Callout>
      )}
    </div>
  );
}
