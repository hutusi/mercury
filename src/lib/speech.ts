import type { ScriptLine } from "../content/types";

/**
 * Browser Web Speech API helpers. Client-only: every entry point checks for
 * window, and components using these must render behind a mounted gate to
 * avoid SSR/hydration mismatches.
 */

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null;
}

export function sttSupported(): boolean {
  return recognitionCtor() !== null;
}

/** Voices load asynchronously in Chrome — resolve once they're available. */
export function loadVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve([]);
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) return resolve(existing);

    const timer = setTimeout(() => resolve(synth.getVoices()), timeoutMs);
    synth.addEventListener(
      "voiceschanged",
      () => {
        clearTimeout(timer);
        resolve(synth.getVoices());
      },
      { once: true },
    );
  });
}

/** Distinct English voices so dialogue speakers A/B sound different. */
export function pickEnglishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (english.length === 0) return [];
  // Prefer local/default voices first for reliability.
  return [...english].sort((a, b) => {
    const score = (v: SpeechSynthesisVoice) => (v.localService ? 2 : 0) + (v.default ? 1 : 0);
    return score(b) - score(a);
  });
}

export interface ScriptSpeaker {
  play(): void;
  stop(): void;
  readonly playing: boolean;
}

/**
 * Speaks a script line by line, alternating voices per speaker. One utterance
 * per line keeps each chunk short — Chrome silently cuts long utterances.
 * Always call stop() on unmount to prevent zombie audio across navigation.
 */
export function createScriptSpeaker(
  lines: ScriptLine[],
  options: {
    rate?: number;
    onLineChange?: (index: number) => void;
    onEnd?: () => void;
  } = {},
): ScriptSpeaker {
  const rate = options.rate ?? 0.95;
  let cancelled = false;
  let playing = false;
  let voiceBySpeaker: Partial<Record<ScriptLine["speaker"], SpeechSynthesisVoice>> = {};

  async function assignVoices() {
    const english = pickEnglishVoices(await loadVoices());
    if (english.length === 0) return;
    voiceBySpeaker = {
      A: english[0],
      narrator: english[0],
      B: english[1] ?? english[0],
    };
  }

  function speakLine(index: number) {
    if (cancelled || index >= lines.length) {
      playing = false;
      if (!cancelled) options.onEnd?.();
      return;
    }
    const line = lines[index];
    options.onLineChange?.(index);
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    const voice = voiceBySpeaker[line.speaker];
    if (voice) utterance.voice = voice;
    utterance.onend = () => speakLine(index + 1);
    utterance.onerror = () => speakLine(index + 1);
    window.speechSynthesis.speak(utterance);
  }

  return {
    get playing() {
      return playing;
    },
    play() {
      if (!ttsSupported() || playing) return;
      cancelled = false;
      playing = true;
      window.speechSynthesis.cancel();
      void assignVoices().then(() => {
        if (!cancelled) speakLine(0);
      });
    },
    stop() {
      cancelled = true;
      playing = false;
      if (ttsSupported()) window.speechSynthesis.cancel();
    },
  };
}

export interface Recognizer {
  start(): void;
  stop(): void;
  abort(): void;
}

/**
 * Continuous English speech recognition with interim results.
 * Chrome/Edge only; caller must gate on sttSupported().
 */
export function createRecognizer(callbacks: {
  onTranscript: (finalText: string, interimText: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}): Recognizer | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = "";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += `${result[0].transcript} `;
      } else {
        interim += result[0].transcript;
      }
    }
    callbacks.onTranscript(finalText.trim(), interim);
  };
  recognition.onerror = (event) => callbacks.onError?.(event.error);
  recognition.onend = () => callbacks.onEnd?.();

  return recognition;
}
