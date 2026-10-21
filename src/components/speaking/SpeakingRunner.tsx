"use client";

import { Ban, Mic, RotateCcw, Square } from "lucide-react";
import { LocalizedLink as Link } from "@/lib/i18n/LocalizedLink";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { PremiumCta } from "@/components/premium/PremiumCta";
import { SelfAssessNotice, SelfCheck } from "@/components/feedback/FeedbackParts";
import { StationNode } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { Bilingual } from "@/content/types";
import { retrySpeakingFeedback, submitSpeaking, type SpeakingResult } from "@/lib/actions/speaking";
import { requestIdForInput, type LogicalRequestId } from "@/lib/client-request-id";
import { DAY_MS } from "@/lib/drafts";
import { retryWhileInProgress } from "@/lib/in-progress-retry";
import { useBeforeUnloadGuard, useDraft } from "@/lib/use-draft";
import { useT } from "@/lib/i18n/LocaleProvider";
import { createRecognizer, sttSupported, type Recognizer } from "@/lib/speech";
import { SpeakingFeedbackPanel } from "./SpeakingFeedbackPanel";
import { useFlowExit } from "@/lib/flow-store";

type Phase = "idle" | "prep" | "recording" | "review" | "done";

interface SpeakingDraft {
  transcript: string;
  spokenSeconds: number;
}

function isSpeakingDraft(value: unknown): value is SpeakingDraft {
  const v = value as SpeakingDraft | null;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.transcript === "string" &&
    Number.isFinite(v.spokenSeconds)
  );
}
const isEmptyDraft = (d: SpeakingDraft) => d.transcript.trim().length === 0;

export function SpeakingRunner({
  promptId,
  prepSeconds,
  speakSeconds,
  modelAnswer,
  checklist,
  aiEnabled,
  showPremiumCta = false,
  nextStop,
}: {
  promptId: string;
  prepSeconds: number;
  speakSeconds: number;
  modelAnswer: string;
  checklist: Bilingual[];
  aiEnabled: boolean;
  /** Quota walls upsell only non-premium learners. */
  showPremiumCta?: boolean;
  /** Server-rendered next-stop CTA when this prompt is a plan stop. */
  nextStop?: React.ReactNode;
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [retrying, startRetry] = useTransition();

  const recognizerRef = useRef<Recognizer | null>(null);
  const deadlineRef = useRef(0);
  const recordStartRef = useRef(0);
  const doneRef = useRef<HTMLDivElement>(null);
  const submissionRequestRef = useRef<LogicalRequestId | null>(null);
  const retryRequestRef = useRef<LogicalRequestId | null>(null);

  // Latest-ref pattern: recognition callbacks and the draft restore read the
  // current phase.
  const phaseRef = useRef<Phase>("idle");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // An unsubmitted transcript survives a reload (the recording itself can't):
  // the learner lands back on the review step with their answer intact.
  const draftValue = useMemo(
    () => ({ transcript: phase === "review" ? finalText : "", spokenSeconds }),
    [phase, finalText, spokenSeconds],
  );
  const draft = useDraft({
    kind: "speaking",
    id: promptId,
    value: draftValue,
    enabled: phase === "review" && !pending,
    maxAgeMs: 2 * DAY_MS,
    validate: isSpeakingDraft,
    isEmpty: isEmptyDraft,
    onRestore: (saved) => {
      if (isEmptyDraft(saved) || phaseRef.current !== "idle") return;
      setFinalText(saved.transcript);
      setSpokenSeconds(saved.spokenSeconds);
      setPhase("review");
    },
  });
  // Leaving mid-recording loses the take; ask first. A finished take's
  // transcript is a draft, so leaving the review step is safe.
  useBeforeUnloadGuard(phase === "recording" || phase === "prep" || pending);
  useFlowExit(phase === "recording" || phase === "prep" ? "confirm" : "saved", phase === "review");

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
    submissionRequestRef.current = null;
    draft.clear();
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
    setSubmitError(null);
    startTransition(async () => {
      try {
        const durationSeconds = Math.min(spokenSeconds || speakSeconds, 600);
        const fingerprint = JSON.stringify({ promptId, transcript: finalText, durationSeconds });
        const request = requestIdForInput(submissionRequestRef.current, fingerprint);
        submissionRequestRef.current = request;
        // A resubmit while the first call is still grading waits for that
        // result instead of failing (same request id).
        const r = await retryWhileInProgress(
          () =>
            submitSpeaking({
              requestId: request.requestId,
              promptId,
              transcript: finalText,
              durationSeconds,
            }),
          (x) => !x.ok,
        );
        if (!r.ok) {
          setSubmitError(t.common.stillGrading);
          return;
        }
        submissionRequestRef.current = null;
        draft.clear();
        setResult(r);
        setPhase("done");
        window.scrollTo({ top: 0 });
        // Focus follows the view swap: the recorder it replaces is gone.
        requestAnimationFrame(() => doneRef.current?.focus());
      } catch {
        // Stay in review so the recording can be resubmitted.
        setSubmitError(t.common.submitRetry);
      }
    });
  }

  function retryFeedback() {
    if (!result) return;
    setRetryError(null);
    startRetry(async () => {
      try {
        const request = requestIdForInput(retryRequestRef.current, result.submissionId);
        retryRequestRef.current = request;
        const r = await retryWhileInProgress(
          () => retrySpeakingFeedback(result.submissionId, request.requestId),
          (x) => "inProgress" in x,
        );
        if ("limited" in r) {
          setRetryError(t.speaking.aiQuotaRetry);
          return;
        }
        if ("inProgress" in r) {
          setRetryError(t.common.stillGrading);
          return;
        }
        setResult(r);
      } catch {
        setRetryError(t.speaking.aiFailed);
      }
    });
  }

  if (!mounted) return null;

  if (!sttSupported()) {
    return (
      <div className="flex flex-col gap-8">
        <Callout variant="error" className="flex items-start gap-2.5 px-5 py-4 text-sm">
          <Ban className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t.speaking.unsupported}
        </Callout>
        <SelfCheck
          idPrefix="speak"
          checklist={checklist}
          checklistLabel={t.speaking.checklist}
          modelAnswer={modelAnswer}
          modelAnswerLabel={t.speaking.modelAnswer}
        />
      </div>
    );
  }

  if (phase === "done" && result) {
    const selfCheck = (
      <SelfCheck
        idPrefix="speak"
        checklist={checklist}
        checklistLabel={t.speaking.checklist}
        modelAnswer={modelAnswer}
        modelAnswerLabel={t.speaking.modelAnswer}
      />
    );
    return (
      <div ref={doneRef} tabIndex={-1} className="flex flex-col gap-8 outline-hidden">
        {result.status === "ai_scored" && result.feedback ? (
          <SpeakingFeedbackPanel feedback={result.feedback} />
        ) : result.degradeReason === "quota" ? (
          // The daily grading quota forced self-assessment — retrying today
          // would just be refused, so the notice says "tomorrow" and the only
          // door to more capacity is premium.
          <>
            <SelfAssessNotice
              title={t.speaking.aiQuotaTitle}
              hint={t.speaking.aiQuotaHint}
              retry={showPremiumCta ? <PremiumCta /> : undefined}
            />
            {selfCheck}
          </>
        ) : (
          <>
            <SelfAssessNotice
              title={aiEnabled ? t.speaking.aiUnavailableTitle : t.speaking.selfAssessTitle}
              hint={aiEnabled ? t.speaking.aiUnavailableHint : t.speaking.selfAssessHint}
              retry={
                aiEnabled ? (
                  <>
                    <Button disabled={retrying} onClick={retryFeedback}>
                      <RotateCcw aria-hidden />
                      {retrying ? t.speaking.submitting : t.speaking.retryFeedback}
                    </Button>
                    {retryError ? (
                      <p role="alert" className="text-sm text-destructive">
                        {retryError}
                      </p>
                    ) : null}
                  </>
                ) : undefined
              }
            />
            {selfCheck}
          </>
        )}
        <TranscriptCard text={finalText} seconds={spokenSeconds} />
        <div className="flex flex-col gap-2.5">
          {nextStop}
          <div className="flex gap-2.5">
            <Button variant="outline" className="flex-1" onClick={beginPrep}>
              <RotateCcw aria-hidden />
              {t.speaking.again}
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/speaking">{t.reading.backToList}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {micError ? (
        <Callout variant="accent" className="px-4 py-3 text-sm">
          {micError}
        </Callout>
      ) : null}

      {phase === "idle" ? (
        <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-9 text-center">
          <button
            type="button"
            onClick={beginPrep}
            className="flex size-[4.5rem] items-center justify-center rounded-full bg-brand text-brand-foreground outline-hidden transition-colors duration-200 hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Mic className="size-7" aria-hidden />
            <span className="sr-only">{t.speaking.startPrep}</span>
          </button>
          <p className="mt-4 text-[0.9375rem] font-medium">{t.speaking.startPrep}</p>
          <p className="mt-1 text-[0.8125rem] text-muted-foreground">{t.speaking.readyHint}</p>
        </div>
      ) : null}

      {phase === "prep" ? (
        <div className="flex flex-col items-center rounded-xl bg-muted px-6 py-9 text-center">
          <p className="text-[0.8125rem] font-semibold text-soft-2">{t.speaking.prep}</p>
          <Countdown seconds={secondsLeft} />
          <Button onClick={beginRecording} variant="outline" className="mt-5">
            {t.speaking.skipPrep}
          </Button>
        </div>
      ) : null}

      {phase === "recording" ? (
        <div className="flex flex-col items-center rounded-xl border border-brand-border bg-card px-6 py-9 text-center">
          <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-brand-ink">
            <span className="size-2.5 animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
            {t.speaking.recording}
          </p>
          <Countdown seconds={secondsLeft} />
          <div className="mt-5 min-h-20 w-full max-w-xl rounded-lg bg-muted px-4 py-3 text-left text-[0.9375rem] leading-relaxed">
            {finalText}
            <span className="text-muted-foreground">{interimText ? ` ${interimText}` : ""}</span>
          </div>
          <Button onClick={stopRecording} className="mt-5">
            <Square className="fill-current" aria-hidden />
            {t.speaking.stop}
          </Button>
        </div>
      ) : null}

      {phase === "review" ? (
        <div className="flex flex-col gap-4">
          <TranscriptCard text={finalText} seconds={spokenSeconds} />
          <div className="flex gap-2.5">
            <Button onClick={beginPrep} disabled={pending} variant="outline" className="flex-1">
              <RotateCcw aria-hidden />
              {t.speaking.again}
            </Button>
            <Button
              onClick={submit}
              disabled={pending || finalText.trim().length < 10}
              className="flex-1"
            >
              {pending ? t.speaking.submitting : t.speaking.submitForFeedback}
            </Button>
          </div>
          {pending ? (
            <Callout
              variant="accent"
              role="status"
              className="flex items-center gap-3 px-4 py-3 text-sm"
            >
              <StationNode className="size-6 shrink-0" />
              {t.speaking.submitting}
            </Callout>
          ) : null}
          {submitError ? (
            <Callout variant="error" className="px-4 py-3 text-sm">
              {submitError}
            </Callout>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The big serif seconds counter for prep and recording. */
function Countdown({ seconds }: { seconds: number }) {
  const t = useT();
  return (
    <p className="mt-2 font-serif text-6xl leading-none font-medium tabular-nums">
      {seconds}
      <span className="ml-1 font-sans text-base font-normal text-muted-foreground">
        {t.speaking.secondsUnit}
      </span>
    </p>
  );
}

/** What the recognizer heard — what gets graded. */
function TranscriptCard({ text, seconds }: { text: string; seconds: number }) {
  const t = useT();
  return (
    <section aria-labelledby="speak-transcript">
      <h2 id="speak-transcript" className="text-[0.9375rem] font-semibold">
        {t.speaking.transcript}
        {seconds > 0 ? (
          <span className="ml-2 font-normal text-muted-foreground tabular-nums">
            {seconds}
            {t.common.seconds}
          </span>
        ) : null}
      </h2>
      {text ? (
        <p className="mt-3 rounded-lg border border-border bg-card px-5 py-4 text-[0.9375rem] leading-[1.75]">
          {text}
        </p>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-input px-5 py-4 text-sm text-muted-foreground">
          {t.speaking.emptyTranscript}
        </p>
      )}
    </section>
  );
}
