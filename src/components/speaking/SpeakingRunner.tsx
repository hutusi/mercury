"use client";

import { Ban, Mic } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useEffect, useRef, useState, useTransition } from "react";
import { SectionLabel } from "@/components/typography/SectionLabel";
import { Button } from "@/components/ui/button";
import type { Bilingual } from "@/content/types";
import { submitSpeaking, type SpeakingResult } from "@/lib/actions/speaking";
import { useT } from "@/lib/i18n/LocaleProvider";
import { createRecognizer, sttSupported, type Recognizer } from "@/lib/speech";
import { SpeakingFeedbackPanel } from "./SpeakingFeedbackPanel";

type Phase = "idle" | "prep" | "recording" | "review" | "done";

export function SpeakingRunner({
  promptId,
  prepSeconds,
  speakSeconds,
  modelAnswer,
  checklist,
}: {
  promptId: string;
  prepSeconds: number;
  speakSeconds: number;
  modelAnswer: string;
  checklist: Bilingual[];
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [spokenSeconds, setSpokenSeconds] = useState(0);
  const [pending, startTransition] = useTransition();

  const recognizerRef = useRef<Recognizer | null>(null);
  const deadlineRef = useRef(0);
  const recordStartRef = useRef(0);
  // Latest-ref pattern: recognition callbacks read the current phase.
  const phaseRef = useRef<Phase>("idle");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mounted-gate: speech APIs only exist client-side
    setMounted(true);
    return () => recognizerRef.current?.abort();
  }, []);

  // Single ticking effect drives both prep and recording countdowns.
  useEffect(() => {
    if (phase !== "prep" && phase !== "recording") return;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(tick);
        if (phaseRef.current === "prep") beginRecording();
        else stopRecording();
      }
    }, 250);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function beginPrep() {
    if (prepSeconds <= 0) {
      beginRecording();
      return;
    }
    deadlineRef.current = Date.now() + prepSeconds * 1000;
    setSecondsLeft(prepSeconds);
    setPhase("prep");
  }

  function beginRecording() {
    setMicError(null);
    setFinalText("");
    setInterimText("");
    const recognizer = createRecognizer({
      onTranscript: (final, interim) => {
        setFinalText(final);
        setInterimText(interim);
      },
      onError: (error) => {
        if (error === "not-allowed" || error === "service-not-allowed") {
          setMicError(t.speaking.micDenied);
          setPhase("idle");
        } else if (error === "no-speech") {
          setMicError(t.speaking.noSpeech);
        }
      },
      onEnd: () => {
        if (phaseRef.current === "recording") setPhase("review");
      },
    });
    if (!recognizer) return;
    recognizerRef.current = recognizer;
    recordStartRef.current = Date.now();
    deadlineRef.current = Date.now() + speakSeconds * 1000;
    setSecondsLeft(speakSeconds);
    setPhase("recording");
    recognizer.start();
  }

  function stopRecording() {
    setSpokenSeconds(Math.round((Date.now() - recordStartRef.current) / 1000));
    recognizerRef.current?.stop();
    setPhase("review");
  }

  function submit() {
    startTransition(async () => {
      const r = await submitSpeaking({
        promptId,
        transcript: finalText,
        durationSeconds: Math.min(spokenSeconds || speakSeconds, 600),
      });
      setResult(r);
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (!mounted) return null;

  if (!sttSupported()) {
    return (
      <div className="space-y-6">
        <div className="border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive">
          <span aria-hidden>
            <Ban className="inline size-4" />
          </span>{" "}
          {t.speaking.unsupported}
        </div>
        <SelfAssessBlock modelAnswer={modelAnswer} checklist={checklist} />
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="space-y-6">
        <section className="border-y border-border py-5">
          <SectionLabel as="h2" className="mb-2">
            {t.speaking.transcript}
          </SectionLabel>
          <p className="text-sm leading-relaxed text-foreground/80">{finalText}</p>
        </section>
        {result.status === "ai_scored" && result.feedback ? (
          <SpeakingFeedbackPanel feedback={result.feedback} />
        ) : (
          <SelfAssessBlock modelAnswer={modelAnswer} checklist={checklist} showHint />
        )}
        <Link
          href="/speaking"
          className="inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {t.common.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {micError && (
        <div className="border border-cinnabar/30 bg-cinnabar/5 p-3 text-sm">{micError}</div>
      )}

      {phase === "idle" && (
        <div className="border border-border p-8 text-center">
          <p className="font-mono text-sm text-muted-foreground tabular-nums">
            {t.speaking.prep}: {prepSeconds}
            {t.common.seconds} · {t.speaking.speak}: {speakSeconds}
            {t.common.seconds}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={beginPrep} size="lg" className="h-11 px-6">
              <Mic className="size-4" aria-hidden /> {t.speaking.startPrep}
            </Button>
          </div>
        </div>
      )}

      {phase === "prep" && (
        <div className="border border-cinnabar/40 bg-cinnabar/5 p-8 text-center">
          <SectionLabel as="p" className="text-cinnabar">
            {t.speaking.prep}
          </SectionLabel>
          <p className="mt-2 font-mono text-5xl font-semibold text-cinnabar tabular-nums">
            {secondsLeft}
          </p>
          <Button onClick={beginRecording} variant="accent" className="mt-5">
            {t.speaking.skipPrep}
          </Button>
        </div>
      )}

      {phase === "recording" && (
        <div className="border border-cinnabar/40 p-8 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-cinnabar">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-cinnabar motion-reduce:animate-none" />
            {t.speaking.recording}
          </p>
          <p className="mt-2 font-mono text-5xl font-semibold tabular-nums">{secondsLeft}</p>
          <div className="mx-auto mt-4 min-h-16 max-w-xl bg-muted p-3 text-left text-sm text-foreground/80">
            {finalText}
            <span className="text-muted-foreground/70">{interimText ? ` ${interimText}` : ""}</span>
          </div>
          <Button onClick={stopRecording} variant="accent" className="mt-5 px-6">
            ⏹ {t.speaking.stop}
          </Button>
        </div>
      )}

      {phase === "review" && (
        <div className="space-y-4">
          <section className="border-y border-border py-5">
            <SectionLabel as="h2" className="mb-2">
              {t.speaking.transcript}
            </SectionLabel>
            {finalText ? (
              <p className="text-sm leading-relaxed text-foreground/80">{finalText}</p>
            ) : (
              <p className="text-sm text-muted-foreground/70">{t.speaking.emptyTranscript}</p>
            )}
          </section>
          <div className="flex gap-3">
            <Button
              onClick={beginPrep}
              disabled={pending}
              variant="outline"
              size="lg"
              className="h-11 flex-1"
            >
              🔁 {t.common.tryAgain}
            </Button>
            <Button
              onClick={submit}
              disabled={pending || finalText.trim().length < 10}
              size="lg"
              className="h-11 flex-1 disabled:cursor-not-allowed"
            >
              {pending ? t.speaking.submitting : t.speaking.submitForFeedback}
            </Button>
          </div>
          {pending && (
            <div className="border border-border bg-muted p-3 text-center text-sm text-muted-foreground">
              {t.speaking.submitting}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SelfAssessBlock({
  modelAnswer,
  checklist,
  showHint,
}: {
  modelAnswer: string;
  checklist: Bilingual[];
  showHint?: boolean;
}) {
  const t = useT();
  return (
    <div className="space-y-4">
      {showHint && (
        <div className="border border-cinnabar/30 bg-cinnabar/5 p-4 text-sm">
          <p className="font-medium">{t.writing.selfAssessTitle}</p>
          <p className="mt-1 text-muted-foreground">{t.writing.selfAssessHint}</p>
        </div>
      )}
      <section className="border-y border-border py-6">
        <SectionLabel as="h2" className="mb-3">
          {t.speaking.checklist}
        </SectionLabel>
        <ul className="space-y-3">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                id={`speak-check-${i}`}
                className="mt-0.5 h-4 w-4 rounded-sm border-border accent-cinnabar"
              />
              <label htmlFor={`speak-check-${i}`} className="cursor-pointer">
                <span className="font-medium">{item.zh}</span>
                <span className="block text-muted-foreground">{item.en}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
      <section className="border-y border-border py-6">
        <SectionLabel as="h2" className="mb-3">
          {t.speaking.modelAnswer}
        </SectionLabel>
        <p className="font-serif text-sm leading-relaxed whitespace-pre-line text-foreground/80">
          {modelAnswer}
        </p>
      </section>
    </div>
  );
}
