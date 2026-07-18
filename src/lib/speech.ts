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

/**
 * English voices ranked best-first so dialogue speakers A/B sound natural and
 * different. Quality beats locality: Edge's "Online (Natural)" neural voices,
 * Apple's Premium/Enhanced/Siri variants, and Chrome's remote Google voices all
 * outclass the legacy localService voices, which sound robotic. A remote voice
 * that fails mid-script is survivable — utterance.onerror advances to the next
 * line — so there is no reliability reason to prefer local voices.
 */
export function pickEnglishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (english.length === 0) return [];
  const tier = (v: SpeechSynthesisVoice) => {
    if (/natural|neural/i.test(v.name)) return 4;
    if (/premium|enhanced|siri/i.test(v.name)) return 3;
    if (/^google/i.test(v.name)) return 2;
    return v.default ? 1 : 0;
  };
  const isUs = (v: SpeechSynthesisVoice) => /^en[-_]us/i.test(v.lang);
  return [...english].sort(
    (a, b) =>
      tier(b) - tier(a) || Number(isUs(b)) - Number(isUs(a)) || a.name.localeCompare(b.name),
  );
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
    const primary = english[0];
    const distinct = english.find((v) => v.name !== primary.name) ?? primary;
    voiceBySpeaker = {
      A: primary,
      narrator: primary,
      B: distinct,
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

export interface WordSpeaker {
  speak(text: string): void;
  stop(): void;
}

/**
 * Single-utterance speaker for headwords and example sentences. speak()
 * cancels anything in flight so a repeat click restarts; the generation
 * counter drops stale async voice loads after stop() or a newer speak().
 * Always call stop() on unmount to prevent zombie audio across navigation.
 */
export function createWordSpeaker(options: { rate?: number } = {}): WordSpeaker {
  const rate = options.rate ?? 0.95;
  let generation = 0;

  return {
    speak(text: string) {
      if (!ttsSupported()) return;
      const mine = ++generation;
      window.speechSynthesis.cancel();
      void loadVoices().then((voices) => {
        if (mine !== generation) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = rate;
        const voice = pickEnglishVoices(voices)[0];
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      });
    },
    stop() {
      generation++;
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
