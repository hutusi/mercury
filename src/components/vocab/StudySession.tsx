"use client";

import { Check, Flame, Undo2, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Kbd } from "@/components/ui/kbd";
import { useToast } from "@/components/ui/toast";
import { gradeCard, undoGrade } from "@/lib/actions/vocab";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { useFlowCounter, useFlowExit } from "@/lib/flow-store";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { fill } from "@/lib/i18n/fill";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { localePath } from "@/lib/i18n/routing";
import { createWordSpeaker, ttsSupported, type WordSpeaker } from "@/lib/speech";
import { previewNextReview, type NextReview, type ReviewGrade, type SrsState } from "@/lib/srs";
import { cn } from "@/lib/utils";

export interface StudyCardData {
  wordId: string;
  headword: string;
  ipa: string;
  pos: string;
  definitionEn: string;
  translationZh: string;
  exampleEn: string;
  exampleZh: string;
  /** Pre-generated headword pronunciation (ADR 0023); null → browser TTS. */
  audioUrl: string | null;
  isNew: boolean;
  /** Scheduler state, for the interval each grade would give. */
  srs: SrsState;
}

/** Device-level preference: auto-pronounce the headword when a card is flipped. */
const AUTO_SPEAK_KEY = "mercury.vocab.autoSpeak";

const GRADES: { grade: ReviewGrade; key: string }[] = [
  { grade: 1, key: "1" },
  { grade: 3, key: "2" },
  { grade: 4, key: "3" },
  { grade: 5, key: "4" },
];

/** One step back in the session: enough to undo a grade exactly. */
interface HistoryEntry {
  reviewId: string;
  index: number;
  queueLength: number;
  card: StudyCardData;
  grade: ReviewGrade;
}

function gradeLabel(t: Dictionary, grade: ReviewGrade) {
  return grade === 1
    ? t.vocab.again
    : grade === 3
      ? t.vocab.hard
      : grade === 4
        ? t.vocab.good
        : t.vocab.easy;
}

function nextReviewText(t: Dictionary, next: NextReview) {
  switch (next.unit) {
    case "minutes":
      return fill(t.vocab.inMinutes, { n: next.n });
    case "tomorrow":
      return t.vocab.tomorrow;
    case "days":
      return fill(t.vocab.inDays, { n: next.n });
    case "months":
      return fill(t.vocab.inMonths, { n: next.n });
  }
}

/**
 * The flashcard session. Every grade is saved as it lands (idempotently, ADR
 * 0031), so leaving is always safe. Each grade button shows when the card
 * returns; a mis-tap can be undone (button or U) within the session; the
 * session ends on the streak and the next stop.
 */
export function StudySession({
  cards,
  streak,
  checkedInToday,
  nextStop,
  inPlan,
}: {
  cards: StudyCardData[];
  /** Streak at page load. */
  streak: number;
  /** Whether today was already checked in at page load. */
  checkedInToday: boolean;
  /** The "下一站" CTA (server-rendered), shown on the done screen in plan mode. */
  nextStop?: React.ReactNode;
  /** Part of today's route (exit returns to Today) or free practice. */
  inPlan: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const speakerRef = useRef<WordSpeaker | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<LogicalRequestId | null>(null);
  const cardRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mounted-gate: speech APIs only exist client-side
    setMounted(true);
    try {
      setAutoSpeak(localStorage.getItem(AUTO_SPEAK_KEY) !== "off");
    } catch {
      // Storage unavailable: keep the default.
    }
    speakerRef.current = createWordSpeaker();
    audioRef.current = new Audio();
    return () => {
      speakerRef.current?.stop();
      audioRef.current?.pause();
    };
  }, []);

  const card = queue[index];
  const reviewed = history.length;
  const done = !card && reviewed > 0;
  useFlowCounter(card ? `${index + 1} / ${queue.length}` : null);
  // Every grade is saved as it lands; mid-session exits say so.
  useFlowExit("saved", reviewed > 0 && Boolean(card));

  useEffect(() => {
    if (done) requestAnimationFrame(() => doneRef.current?.focus());
  }, [done]);

  function stopAudio() {
    audioRef.current?.pause();
    speakerRef.current?.stop();
  }

  // Headword pronunciation prefers the pre-generated render (ADR 0023) and
  // falls back to browser TTS when there is none or it fails to play.
  function speakHeadword(c: StudyCardData) {
    stopAudio();
    const el = audioRef.current;
    if (!c.audioUrl || !el) {
      speakerRef.current?.speak(c.headword);
      return;
    }
    const resolved = new URL(c.audioUrl, window.location.href).href;
    if (el.src !== resolved) el.src = resolved;
    el.currentTime = 0;
    void el.play().catch(() => speakerRef.current?.speak(c.headword));
  }

  // Auto-pronounce rides the flip so play() stays inside a user gesture.
  const flip = useCallback(() => {
    if (!card || flipped) return;
    setFlipped(true);
    if (autoSpeak) speakHeadword(card);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speakHeadword reads refs only
  }, [card, flipped, autoSpeak]);

  function toggleAutoSpeak() {
    const next = !autoSpeak;
    setAutoSpeak(next);
    try {
      localStorage.setItem(AUTO_SPEAK_KEY, next ? "on" : "off");
    } catch {
      // Not persisted; the session still honours it.
    }
    if (!next) stopAudio();
  }

  const grade = useCallback(
    (g: ReviewGrade) => {
      if (!card || pending || !flipped) return;
      setError(null);
      stopAudio();
      // One idempotency key per queue position (ADR 0031): a retry after a
      // lost response replays the stored grade instead of advancing the card
      // twice — even if the learner picks a different button on the retry.
      const request = requestIdForInput(requestRef.current, `${index}:${card.wordId}`);
      requestRef.current = request;
      startTransition(async () => {
        try {
          const result = await gradeCard({
            wordId: card.wordId,
            grade: g,
            requestId: request.requestId,
          });
          if (!result.ok) {
            requestRef.current = null;
            setError(t.common.submitRetry);
            return;
          }
          requestRef.current = null;
          setHistory((h) => [
            ...h,
            {
              reviewId: result.reviewId,
              index,
              queueLength: queue.length,
              card,
              grade: result.grade,
            },
          ]);
          // "Forgot" re-queues the card for a second pass. A replay reports
          // the ORIGINAL grade, which is the one that counts.
          setQueue((q) =>
            result.grade === 1 ? [...q, { ...card, isNew: false, srs: result.srs }] : q,
          );
          setFlipped(false);
          setIndex((i) => i + 1);
          requestAnimationFrame(() => cardRef.current?.focus({ preventScroll: true }));
        } catch {
          // Keep the card in place so the grade can be retried.
          setError(t.common.submitRetry);
        }
      });
    },

    [card, flipped, index, pending, queue.length, t],
  );

  const undo = useCallback(() => {
    const last = history.at(-1);
    if (!last || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await undoGrade({ reviewId: last.reviewId }).catch(() => null);
      if (!result) {
        setError(t.common.submitRetry);
        return;
      }
      if (!result.ok && result.reason === "stale") {
        toast.show(t.vocab.undoGone);
        return;
      }
      // "gone" means an earlier attempt already undid it: restore locally too.
      setHistory((h) => h.slice(0, -1));
      // Grading never moves cards, and "again" only appends one: trimming to
      // the pre-grade length restores the queue exactly.
      setQueue((q) => q.slice(0, last.queueLength));
      setIndex(last.index);
      setFlipped(true);
      toast.show(t.vocab.undone);
    });
  }, [history, pending, t, toast]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === "Escape") {
        router.push(localePath(locale, inPlan ? "/dashboard" : "/vocabulary"));
        if (reviewed > 0 && card) toast.show(t.flow.saved);
        return;
      }
      if (e.key === "u" || e.key === "U") {
        if (!flipped || done) undo();
        return;
      }
      if (!card || pending) return;
      if (e.key === " " && !flipped) {
        // Space on a focused button already clicks it.
        if (el?.tagName === "BUTTON") return;
        e.preventDefault();
        flip();
        return;
      }
      if (!flipped) return;
      const match = GRADES.find((g) => g.key === e.key);
      if (!match) return;
      e.preventDefault();
      grade(match.grade);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [card, done, flip, flipped, grade, inPlan, locale, pending, reviewed, router, t, toast, undo]);

  const canSpeak = mounted && (ttsSupported() || Boolean(card?.audioUrl));
  const canUndo = history.length > 0 && !flipped;

  if (!card) {
    const again = history.filter((h) => h.grade === 1).length;
    const reviewedWords = new Set(history.map((h) => h.card.wordId)).size;
    const streakNow = checkedInToday || reviewed === 0 ? streak : streak + 1;
    return (
      <div className="mx-auto flex max-w-[35rem] flex-col items-center text-center">
        <span className="flex size-[4.5rem] items-center justify-center rounded-full bg-brand-soft text-brand">
          <Check className="size-8" aria-hidden />
        </span>
        <h1
          ref={doneRef}
          tabIndex={-1}
          className="mt-6 font-serif text-[1.75rem] leading-tight font-medium outline-hidden sm:text-4xl"
        >
          {t.vocab.sessionDone}
        </h1>
        <p className="mt-2.5 text-pretty text-muted-foreground">{t.vocab.doneSub}</p>
        <dl className="mt-7 grid w-full grid-cols-3 rounded-xl border border-border bg-card">
          {[
            { label: t.vocab.statReviewed, value: reviewedWords },
            {
              label: t.vocab.statKept,
              value:
                reviewedWords -
                new Set(history.filter((h) => h.grade === 1).map((h) => h.card.wordId)).size,
            },
            { label: t.vocab.statAgain, value: again },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={cn("px-2 py-[1.125rem]", i > 0 && "border-l border-border")}
            >
              <dd className="font-serif text-[2.125rem] leading-none font-medium tabular-nums">
                {stat.value}
              </dd>
              <dt className="mt-2 text-[0.8125rem] text-muted-foreground">{stat.label}</dt>
            </div>
          ))}
        </dl>
        {reviewed > 0 ? (
          <p className="mt-3.5 flex w-full items-center justify-center gap-2.5 rounded-lg bg-coral-soft px-4 py-3.5 text-[0.9375rem] font-medium text-coral-ink-2">
            <Flame className="size-[1.125rem] text-coral" aria-hidden />
            {fill(t.vocab.streakUp, { n: streakNow })}
          </p>
        ) : null}
        <div className="mt-7 flex w-full flex-col gap-2.5">
          {nextStop}
          {canUndo ? (
            <Button variant="ghost" onClick={undo} disabled={pending} className="self-center">
              <Undo2 aria-hidden />
              {t.vocab.undo}
            </Button>
          ) : null}
          <Button asChild variant="outline" size="lg">
            <Link href={inPlan ? "/dashboard" : "/vocabulary"}>
              {inPlan ? t.flow.backToday : t.vocab.backToVocab}
            </Link>
          </Button>
          {!inPlan ? (
            <Button asChild variant="ghost">
              <Link href="/vocabulary/quiz">{t.vocab.startQuiz}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[37.5rem] flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{t.vocab.cardsLabel}</span>
        <span className="flex-1" />
        {canUndo ? (
          <Button
            variant="outline"
            size="xs"
            onClick={undo}
            disabled={pending}
            aria-keyshortcuts="u"
          >
            <Undo2 aria-hidden />
            {t.vocab.undo}
          </Button>
        ) : null}
        <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
          {fill(t.vocab.reviewedLabel, { n: reviewed })}
        </span>
        {canSpeak ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleAutoSpeak}
            aria-pressed={autoSpeak}
            aria-label={t.vocab.autoSpeak}
            title={t.vocab.autoSpeak}
          >
            {autoSpeak ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
          </Button>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-label={t.vocab.sessionProgress}
        aria-valuemin={0}
        aria-valuemax={queue.length}
        aria-valuenow={index}
        className="h-1 overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-450 ease-out motion-reduce:transition-none"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      {/* The frame stays non-interactive so the speaker can be a sibling of
          the flip button, never nested inside it. */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-raised">
        <button
          ref={cardRef}
          type="button"
          onClick={flip}
          aria-expanded={flipped}
          aria-controls="study-card-answer"
          className={cn(
            "block w-full px-6 pt-10 pb-8 text-center outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:pt-14 sm:pb-10",
            !flipped && "min-h-[18.75rem]",
          )}
        >
          {card.isNew ? (
            <Badge variant="accent" className="mb-3.5">
              {t.vocab.fresh}
            </Badge>
          ) : null}
          <p className="font-serif text-[2.5rem] leading-[1.1] font-medium tracking-[-0.01em] break-words sm:text-[3.625rem]">
            {card.headword}
          </p>
          <p className="mt-3 font-serif text-lg text-muted-foreground italic">
            {card.ipa} · {card.pos}
          </p>
          {!flipped ? (
            <p className="mt-10 text-sm text-muted-foreground">{t.vocab.flipHint}</p>
          ) : null}
        </button>

        {canSpeak ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => speakHeadword(card)}
            aria-label={t.vocab.speakWord}
            className="absolute top-3.5 right-3.5"
          >
            <Volume2 className="size-5" aria-hidden />
          </Button>
        ) : null}

        {flipped ? (
          <div
            id="study-card-answer"
            className="flex flex-col gap-3.5 border-t border-border px-5 pt-6 pb-7 sm:px-8"
          >
            <p className="text-center font-serif text-[1.625rem] leading-snug font-semibold">
              {card.translationZh}
            </p>
            <p className="text-center text-[0.9375rem] text-pretty text-muted-foreground">
              {card.definitionEn}
            </p>
            <div className="mt-1 rounded-lg bg-muted px-[1.125rem] py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-serif text-lg leading-[1.55]">{card.exampleEn}</p>
                {mounted && ttsSupported() ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="-mt-1 -mr-1"
                    onClick={() => {
                      // Example sentences deliberately stay on browser TTS
                      // (ADR 0023); just don't talk over the headword MP3.
                      audioRef.current?.pause();
                      speakerRef.current?.speak(card.exampleEn);
                    }}
                    aria-label={t.vocab.speakExample}
                  >
                    <Volume2 aria-hidden />
                  </Button>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {card.exampleZh}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {!flipped ? (
        <Button size="lg" onClick={flip} className="self-center">
          {t.vocab.reveal}
          <Kbd className="hidden md:inline-flex">Space</Kbd>
        </Button>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(({ grade: g, key }) => {
              const next = nextReviewText(t, previewNextReview(card.srs, g));
              const hintId = `grade-hint-${g}`;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => grade(g)}
                  disabled={pending}
                  aria-keyshortcuts={key}
                  aria-describedby={hintId}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-lg border-[1.5px] bg-card px-1 py-2 outline-hidden transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                    g === 1 ? "border-coral text-coral-ink" : "border-input text-foreground",
                  )}
                >
                  <span className="text-[0.9375rem] leading-snug font-semibold">
                    {gradeLabel(t, g)}
                  </span>
                  <span
                    id={hintId}
                    aria-hidden
                    className="text-xs leading-snug text-muted-foreground tabular-nums"
                  >
                    <span className="hidden md:inline">{key} · </span>
                    {next}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="hidden text-center text-[0.8125rem] text-muted-foreground md:block">
            {t.vocab.keysHint}
          </p>
        </>
      )}

      {error ? (
        <Callout variant="error" className="p-3 text-center text-sm">
          {error}
        </Callout>
      ) : null}
    </div>
  );
}
