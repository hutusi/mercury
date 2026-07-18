import { createHash } from "node:crypto";
import { z } from "zod";
import type { ScriptLine } from "./types";

/**
 * Pre-generated listening audio (ADR 0021): `bun run content:audio` renders
 * each exercise's script to one MP3 under public/audio/listening/ and records
 * it in content/audio-manifest.json, keyed by a hash of everything that shapes
 * the sound. The seed only links audio whose hash still matches the current
 * script — stale audio degrades to browser TTS instead of playing wrong words.
 *
 * Pure module (node:crypto only): shared by the generation script, the seed,
 * and unit tests. Server/tooling-side — never import from client code.
 */

// Type alias (not interface) on purpose: aliases get implicit index-signature
// compatibility with the manifest's Record<string, string> voices field.
export type AudioVoiceCast = { A: string; B: string; narrator: string };

export interface AudioConfig {
  model: string;
  voices: AudioVoiceCast;
  /** Sent as language_type on every synthesis request. */
  languageType: string;
  /** Silence stitched between script lines. */
  lineGapSeconds: number;
  /** MP3 encode bitrate. */
  mp3Kbps: number;
}

/** Distinct American-English casting: male A, female B, news-anchor narrator. */
export const LISTENING_AUDIO_CONFIG: AudioConfig = {
  model: "qwen3-tts-flash",
  voices: { A: "Aiden", B: "Jennifer", narrator: "Neil" },
  languageType: "English",
  lineGapSeconds: 0.4,
  mp3Kbps: 64,
};

export const AudioManifestEntrySchema = z.object({
  hash: z.string().regex(/^[0-9a-f]{12}$/),
  file: z.string().startsWith("/audio/"),
  model: z.string(),
  // Role → voice name. Listening/exam entries use the A/B/narrator cast;
  // vocab entries record their single voice under "narrator".
  voices: z.record(z.string(), z.string()),
  generatedAt: z.string(),
  characters: z.number().int().nonnegative(),
});
export type AudioManifestEntry = z.infer<typeof AudioManifestEntrySchema>;

export const AudioManifestSchema = z.record(z.string(), AudioManifestEntrySchema);
export type AudioManifest = z.infer<typeof AudioManifestSchema>;

export function listeningManifestKey(exerciseId: string): string {
  return `listening:${exerciseId}`;
}

/** Canonical public path for a render — the single source of the convention. */
export function listeningAudioFile(exerciseId: string, hash: string): string {
  return `/audio/listening/${exerciseId}.${hash}.mp3`;
}

/**
 * Everything that shapes the rendered audio goes into the hash: model, voice
 * cast, renderer settings (language, line gap, bitrate), and the ordered
 * (speaker, text) pairs. Editing one script re-renders one exercise; changing
 * any config field re-renders all. Fields are listed explicitly — never
 * spread — so an unrelated future config addition can't silently invalidate
 * every render.
 */
export function scriptAudioHash(script: ScriptLine[], config: AudioConfig): string {
  const canonical = JSON.stringify({
    model: config.model,
    voices: [config.voices.A, config.voices.B, config.voices.narrator],
    renderer: [config.languageType, config.lineGapSeconds, config.mp3Kbps],
    lines: script.map((line) => [line.speaker, line.text]),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 12);
}

/**
 * The audio URL for an exercise, or null when none was generated or it's
 * stale. The path is derived from id + hash rather than trusting entry.file,
 * so a mangled manifest can serve nothing, but never the wrong exercise.
 */
export function resolveAudioUrl(
  exerciseId: string,
  script: ScriptLine[],
  manifest: AudioManifest,
  config: AudioConfig = LISTENING_AUDIO_CONFIG,
): string | null {
  const entry = manifest[listeningManifestKey(exerciseId)];
  if (!entry) return null;
  return entry.hash === scriptAudioHash(script, config)
    ? listeningAudioFile(exerciseId, entry.hash)
    : null;
}

// ── Mock-exam listening groups ──────────────────────────────────────────────
// Same voice cast and renderer settings as practice listening; group ids are
// unique per exam but the exam id joins the key/path anyway for greppability.

export function examManifestKey(examId: string, groupId: string): string {
  return `exam:${examId}:${groupId}`;
}

export function examAudioFile(examId: string, groupId: string, hash: string): string {
  return `/audio/exams/${examId}.${groupId}.${hash}.mp3`;
}

/** Exam-group audio URL, or null when none was generated or it's stale. */
export function resolveExamAudioUrl(
  examId: string,
  groupId: string,
  script: ScriptLine[],
  manifest: AudioManifest,
  config: AudioConfig = LISTENING_AUDIO_CONFIG,
): string | null {
  const entry = manifest[examManifestKey(examId, groupId)];
  if (!entry) return null;
  return entry.hash === scriptAudioHash(script, config)
    ? examAudioFile(examId, groupId, entry.hash)
    : null;
}

// ── Vocab headwords ─────────────────────────────────────────────────────────
// One short utterance per word in a single consistent voice. Example
// sentences deliberately stay on browser TTS (ADR 0023).

export interface WordAudioConfig {
  model: string;
  voice: string;
  languageType: string;
  mp3Kbps: number;
}

export const VOCAB_AUDIO_CONFIG: WordAudioConfig = {
  model: "qwen3-tts-flash",
  voice: "Jennifer",
  languageType: "English",
  mp3Kbps: 64,
};

export function wordAudioHash(text: string, config: WordAudioConfig): string {
  const canonical = JSON.stringify({
    model: config.model,
    voice: config.voice,
    renderer: [config.languageType, config.mp3Kbps],
    text,
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 12);
}

export function vocabManifestKey(wordId: string): string {
  return `vocab:${wordId}`;
}

export function vocabAudioFile(wordId: string, hash: string): string {
  return `/audio/vocab/${wordId}.${hash}.mp3`;
}

/** Headword audio URL, or null when none was generated or it's stale. */
export function resolveVocabAudioUrl(
  wordId: string,
  headword: string,
  manifest: AudioManifest,
  config: WordAudioConfig = VOCAB_AUDIO_CONFIG,
): string | null {
  const entry = manifest[vocabManifestKey(wordId)];
  if (!entry) return null;
  return entry.hash === wordAudioHash(headword, config) ? vocabAudioFile(wordId, entry.hash) : null;
}
