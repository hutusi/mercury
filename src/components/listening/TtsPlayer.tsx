"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Callout } from "@/components/ui/callout";
import type { ScriptLine } from "@/content/types";
import { useT } from "@/lib/i18n/LocaleProvider";
import { createScriptSpeaker, ttsSupported, type ScriptSpeaker } from "@/lib/speech";

/**
 * Plays pre-generated neural audio when the exercise has it (ADR 0021) and
 * degrades to speaking the script with browser TTS when it doesn't — or when
 * the audio fails to load mid-session. The <audio> element is chrome-less on
 * purpose: native controls would expose seeking, which must stay unavailable
 * so maxPlays (exam single-play) can't be bypassed by scrubbing.
 */
export function TtsPlayer({
  script,
  audioUrl,
  maxPlays,
}: {
  script: ScriptLine[];
  audioUrl?: string | null;
  maxPlays?: number;
}) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [lineIndex, setLineIndex] = useState(-1);
  const [playCount, setPlayCount] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [resumable, setResumable] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const speakerRef = useRef<ScriptSpeaker | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioMode = Boolean(audioUrl) && !audioFailed;

  // MUST be identity-stable: React 19 re-runs a changed ref callback's cleanup
  // on every render, and this cleanup pauses the element — an inline callback
  // here paused the media 13ms after play() (the click's own re-render),
  // rejecting it with AbortError and falsely degrading to browser TTS.
  // The pause-on-detach itself is load-bearing: a removed <audio> can keep
  // playing (Chrome) until GC'd.
  const attachAudio = useCallback((el: HTMLAudioElement | null) => {
    audioRef.current = el;
    if (!el) return;
    return () => {
      el.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mounted-gate: speech APIs only exist client-side
    setMounted(true);
    return () => speakerRef.current?.stop();
  }, []);

  if (!mounted) return null;

  if (!audioMode && !ttsSupported()) {
    return (
      <Callout variant="error" className="p-4 text-sm">
        {t.listening.ttsUnsupported}
      </Callout>
    );
  }

  function degradeToTts() {
    // The neural audio never delivered a full listen — hand the play budget
    // back and fall through to the browser voice for the rest of the session.
    audioRef.current?.pause();
    setAudioFailed(true);
    setPlaying(false);
    setResumable(false);
    setAudioProgress(0);
    setPlayCount(0);
  }

  function playAudio() {
    const el = audioRef.current;
    if (!el) return;
    const fresh = el.ended || el.currentTime === 0;
    if (fresh) {
      if (maxPlays !== undefined && playCount >= maxPlays) return;
      el.currentTime = 0;
      setPlayCount((n) => n + 1);
    }
    setPlaying(true);
    setResumable(false);
    void el.play().catch(() => {
      if (el.error) {
        // A real media failure (network/decode/unsupported) — degrade.
        degradeToTts();
        return;
      }
      // Benign rejection: AbortError from an interrupting pause()/unmount or
      // NotAllowedError from autoplay policy. The media is healthy — sync the
      // UI, keep audio mode, and refund the play if nothing was heard yet.
      if (el.currentTime === 0) setPlayCount((n) => Math.max(0, n - 1));
      setPlaying(false);
      setResumable(el.currentTime > 0 && !el.ended);
    });
  }

  function pauseAudio() {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    setPlaying(false);
    setResumable(el.currentTime > 0 && !el.ended);
  }

  function playTts() {
    if (maxPlays !== undefined && playCount >= maxPlays) return;
    speakerRef.current?.stop();
    const speaker = createScriptSpeaker(script, {
      onLineChange: setLineIndex,
      onEnd: () => {
        setPlaying(false);
        setLineIndex(-1);
      },
    });
    speakerRef.current = speaker;
    setPlaying(true);
    setPlayCount((n) => n + 1);
    speaker.play();
  }

  function stopTts() {
    speakerRef.current?.stop();
    setPlaying(false);
    setLineIndex(-1);
  }

  const progress = audioMode
    ? audioProgress
    : playing && lineIndex >= 0
      ? ((lineIndex + 1) / script.length) * 100
      : 0;
  const exhausted = !playing && !resumable && maxPlays !== undefined && playCount >= maxPlays;

  return (
    <div className="border border-border p-5">
      {audioMode && (
        <audio
          ref={attachAudio}
          src={audioUrl ?? undefined}
          preload="auto"
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration > 0) setAudioProgress((el.currentTime / el.duration) * 100);
          }}
          onEnded={() => {
            setPlaying(false);
            setResumable(false);
            setAudioProgress(0);
          }}
          onError={(e) => {
            const err = e.currentTarget.error;
            console.warn(
              `listening audio failed (code=${err?.code ?? "?"}: ${err?.message ?? "unknown"}) — degrading to browser TTS`,
            );
            degradeToTts();
          }}
        />
      )}
      <div className="flex items-center gap-4">
        <button
          onClick={playing ? (audioMode ? pauseAudio : stopTts) : audioMode ? playAudio : playTts}
          disabled={exhausted}
          className={`flex h-12 w-12 shrink-0 items-center justify-center outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            playing
              ? "bg-cinnabar text-cinnabar-foreground hover:bg-cinnabar/90"
              : exhausted
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/85"
          }`}
          aria-label={playing ? t.listening.pause : t.listening.play}
        >
          <span aria-hidden>
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </span>
        </button>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground/80">
            {playing
              ? t.listening.playing
              : exhausted
                ? t.exams.audioOnce
                : resumable
                  ? t.listening.resume
                  : playCount > 0
                    ? t.listening.replay
                    : t.listening.play}
          </p>
          <div className="mt-2 h-1 overflow-hidden bg-muted">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground/70">
        {t.listening.listenFirst}
        {audioFailed && <> · {t.listening.usingBrowserTts}</>}
      </p>
    </div>
  );
}
