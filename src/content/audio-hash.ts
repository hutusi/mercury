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

export interface AudioVoiceCast {
  A: string;
  B: string;
  narrator: string;
}

export interface AudioConfig {
  model: string;
  voices: AudioVoiceCast;
}

/** Distinct American-English casting: male A, female B, news-anchor narrator. */
export const LISTENING_AUDIO_CONFIG: AudioConfig = {
  model: "qwen3-tts-flash",
  voices: { A: "Aiden", B: "Jennifer", narrator: "Neil" },
};

export const AudioManifestEntrySchema = z.object({
  hash: z.string().regex(/^[0-9a-f]{12}$/),
  file: z.string().startsWith("/audio/"),
  model: z.string(),
  voices: z.object({ A: z.string(), B: z.string(), narrator: z.string() }),
  generatedAt: z.string(),
  characters: z.number().int().nonnegative(),
});
export type AudioManifestEntry = z.infer<typeof AudioManifestEntrySchema>;

export const AudioManifestSchema = z.record(z.string(), AudioManifestEntrySchema);
export type AudioManifest = z.infer<typeof AudioManifestSchema>;

export function listeningManifestKey(exerciseId: string): string {
  return `listening:${exerciseId}`;
}

/**
 * Everything that shapes the rendered audio goes into the hash: model, voice
 * cast, and the ordered (speaker, text) pairs. Editing one script re-renders
 * one exercise; recasting a voice or changing the model re-renders all.
 */
export function scriptAudioHash(script: ScriptLine[], config: AudioConfig): string {
  const canonical = JSON.stringify({
    model: config.model,
    voices: [config.voices.A, config.voices.B, config.voices.narrator],
    lines: script.map((line) => [line.speaker, line.text]),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 12);
}

/** The audio URL for an exercise, or null when none was generated or it's stale. */
export function resolveAudioUrl(
  exerciseId: string,
  script: ScriptLine[],
  manifest: AudioManifest,
  config: AudioConfig = LISTENING_AUDIO_CONFIG,
): string | null {
  const entry = manifest[listeningManifestKey(exerciseId)];
  if (!entry) return null;
  return entry.hash === scriptAudioHash(script, config) ? entry.file : null;
}
