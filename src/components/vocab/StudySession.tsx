"use client";

import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gradeCard } from "@/lib/actions/vocab";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { ReviewGrade } from "@/lib/srs";

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
}

export function StudySession({ cards }: { cards: StudyCardData[] }) {
  const t = useT();
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const card = queue[index];

  function grade(g: ReviewGrade) {
    if (!card || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await gradeCard({ wordId: card.wordId, grade: g });
        setReviewed((n) => n + 1);
        // "Again" re-queues the card at the end of this session.
        setQueue((q) => (g === 1 ? [...q, { ...card, isNew: false }] : q));
        setFlipped(false);
        setIndex((i) => i + 1);
      } catch {
        // Keep the card in place so the grade can be retried.
        setError(t.exams.submitFailed);
      }
    });
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-md border border-border p-10 text-center">
        <p className="text-4xl" aria-hidden>
          🎉
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

  // The teacher's-pen scale: "again" is the red mark; the rest stay quiet ink.
  const gradeButtons: { grade: ReviewGrade; label: string; cls: string }[] = [
    {
      grade: 1,
      label: t.vocab.again,
      cls: "bg-cinnabar text-cinnabar-foreground hover:bg-cinnabar/90",
    },
    {
      grade: 3,
      label: t.vocab.hard,
      cls: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
    },
    {
      grade: 4,
      label: t.vocab.good,
      cls: "bg-primary text-primary-foreground hover:bg-primary/85",
    },
    {
      grade: 5,
      label: t.vocab.easy,
      cls: "border border-border bg-background text-foreground hover:bg-muted",
    },
  ];

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

      {/* The flashcard is a full dictionary entry; click to flip. */}
      <button
        onClick={() => setFlipped((f) => !f)}
        className="block min-h-72 w-full cursor-pointer border border-border bg-background p-8 text-center transition-colors outline-none hover:border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
        {flipped ? (
          <div className="mt-6 space-y-4 border-t border-border pt-6 text-left">
            <p className="text-center font-serif text-2xl font-medium">{card.translationZh}</p>
            <p className="text-center text-sm text-muted-foreground">{card.definitionEn}</p>
            <div className="bg-muted p-4 text-sm">
              <p className="font-serif font-medium text-foreground/90">{card.exampleEn}</p>
              <p className="mt-1 text-muted-foreground">{card.exampleZh}</p>
            </div>
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted-foreground/70">{t.vocab.flipHint}</p>
        )}
      </button>

      {flipped && (
        <div className="grid grid-cols-4 gap-2">
          {gradeButtons.map((b) => (
            <button
              key={b.grade}
              onClick={() => grade(b.grade)}
              disabled={pending}
              className={`px-3 py-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 ${b.cls}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
