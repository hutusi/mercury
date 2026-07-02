"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <span aria-hidden>🚫</span> {t.speaking.unsupported}
        </div>
        <SelfAssessBlock modelAnswer={modelAnswer} checklist={checklist} />
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            {t.speaking.transcript}
          </h2>
          <p className="text-sm leading-relaxed text-slate-800">{finalText}</p>
        </section>
        {result.status === "ai_scored" && result.feedback ? (
          <SpeakingFeedbackPanel feedback={result.feedback} />
        ) : (
          <SelfAssessBlock modelAnswer={modelAnswer} checklist={checklist} showHint />
        )}
        <Link href="/speaking" className="inline-block text-sm font-medium text-brand-600 hover:underline">
          ← {t.common.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {micError && (
        <div className="rounded-lg border border-accent-200 bg-accent-50 p-3 text-sm text-accent-700">
          {micError}
        </div>
      )}

      {phase === "idle" && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            {t.speaking.prep}: {prepSeconds}
            {t.common.seconds} · {t.speaking.speak}: {speakSeconds}
            {t.common.seconds}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={beginPrep}
              className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
            >
              <span aria-hidden>🎤</span> {t.speaking.startPrep}
            </button>
          </div>
        </div>
      )}

      {phase === "prep" && (
        <div className="rounded-xl border border-accent-200 bg-accent-50 p-8 text-center">
          <p className="text-sm font-medium text-accent-700">{t.speaking.prep}</p>
          <p className="mt-2 text-5xl font-bold text-accent-600 tabular-nums">{secondsLeft}</p>
          <button
            onClick={beginRecording}
            className="mt-5 rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600"
          >
            {t.speaking.skipPrep}
          </button>
        </div>
      )}

      {phase === "recording" && (
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-red-600">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            {t.speaking.recording}
          </p>
          <p className="mt-2 text-5xl font-bold text-slate-900 tabular-nums">{secondsLeft}</p>
          <div className="mx-auto mt-4 min-h-16 max-w-xl rounded-lg bg-slate-50 p-3 text-left text-sm text-slate-700">
            {finalText}
            <span className="text-slate-400">{interimText ? ` ${interimText}` : ""}</span>
          </div>
          <button
            onClick={stopRecording}
            className="mt-5 rounded-lg bg-red-500 px-6 py-2.5 font-semibold text-white transition hover:bg-red-600"
          >
            ⏹ {t.speaking.stop}
          </button>
        </div>
      )}

      {phase === "review" && (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              {t.speaking.transcript}
            </h2>
            {finalText ? (
              <p className="text-sm leading-relaxed text-slate-800">{finalText}</p>
            ) : (
              <p className="text-sm text-slate-400">{t.speaking.emptyTranscript}</p>
            )}
          </section>
          <div className="flex gap-3">
            <button
              onClick={beginPrep}
              disabled={pending}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              🔁 {t.common.tryAgain}
            </button>
            <button
              onClick={submit}
              disabled={pending || finalText.trim().length < 10}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? t.speaking.submitting : t.speaking.submitForFeedback}
            </button>
          </div>
          {pending && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-center text-sm text-brand-700">
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
        <div className="rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-700">
          <p className="font-semibold">{t.writing.selfAssessTitle}</p>
          <p className="mt-1">{t.writing.selfAssessHint}</p>
        </div>
      )}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          {t.speaking.checklist}
        </h2>
        <ul className="space-y-3">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                id={`speak-check-${i}`}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              <label htmlFor={`speak-check-${i}`} className="cursor-pointer">
                <span className="font-medium text-slate-900">{item.zh}</span>
                <span className="block text-slate-500">{item.en}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          {t.speaking.modelAnswer}
        </h2>
        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800">{modelAnswer}</p>
      </section>
    </div>
  );
}
