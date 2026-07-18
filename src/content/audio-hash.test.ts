import { describe, expect, it } from "bun:test";
import {
  LISTENING_AUDIO_CONFIG,
  listeningManifestKey,
  resolveAudioUrl,
  scriptAudioHash,
  type AudioConfig,
  type AudioManifest,
} from "./audio-hash";
import type { ScriptLine } from "./types";

const script: ScriptLine[] = [
  { speaker: "A", text: "Good morning." },
  { speaker: "B", text: "Morning! Ready for the quarterly review?" },
];
const config: AudioConfig = LISTENING_AUDIO_CONFIG;

describe("scriptAudioHash", () => {
  it("is stable for identical input", () => {
    const hash = scriptAudioHash(script, config);
    expect(hash).toBe(scriptAudioHash([...script.map((l) => ({ ...l }))], config));
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
  });

  it("changes when a line's text is edited", () => {
    const edited = [script[0], { ...script[1], text: "Morning!" }];
    expect(scriptAudioHash(edited, config)).not.toBe(scriptAudioHash(script, config));
  });

  it("changes when a speaker is reassigned", () => {
    const recast = [script[0], { ...script[1], speaker: "narrator" as const }];
    expect(scriptAudioHash(recast, config)).not.toBe(scriptAudioHash(script, config));
  });

  it("changes when lines are reordered", () => {
    expect(scriptAudioHash([script[1], script[0]], config)).not.toBe(
      scriptAudioHash(script, config),
    );
  });

  it("changes when the voice cast or model changes", () => {
    const hash = scriptAudioHash(script, config);
    expect(
      scriptAudioHash(script, { ...config, voices: { ...config.voices, B: "Serena" } }),
    ).not.toBe(hash);
    expect(scriptAudioHash(script, { ...config, model: "qwen-tts" })).not.toBe(hash);
  });
});

describe("resolveAudioUrl", () => {
  const entry = {
    hash: scriptAudioHash(script, config),
    file: "/audio/listening/biz-l-001.abcdef123456.mp3",
    model: config.model,
    voices: config.voices,
    generatedAt: "2026-07-18T00:00:00.000Z",
    characters: 55,
  };
  const manifest: AudioManifest = { [listeningManifestKey("biz-l-001")]: entry };

  it("returns the file when the manifest hash matches the script", () => {
    expect(resolveAudioUrl("biz-l-001", script, manifest, config)).toBe(entry.file);
  });

  it("returns null for an exercise with no manifest entry", () => {
    expect(resolveAudioUrl("biz-l-999", script, manifest, config)).toBeNull();
  });

  it("returns null when the script changed since generation (stale audio)", () => {
    const edited = [script[0], { ...script[1], text: "Different words entirely." }];
    expect(resolveAudioUrl("biz-l-001", edited, manifest, config)).toBeNull();
  });
});
