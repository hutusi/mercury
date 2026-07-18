import { describe, expect, it } from "bun:test";
import {
  examManifestKey,
  LISTENING_AUDIO_CONFIG,
  listeningManifestKey,
  resolveAudioUrl,
  resolveExamAudioUrl,
  resolveVocabAudioUrl,
  scriptAudioHash,
  VOCAB_AUDIO_CONFIG,
  vocabManifestKey,
  wordAudioHash,
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

  it("changes when renderer settings change", () => {
    const hash = scriptAudioHash(script, config);
    expect(scriptAudioHash(script, { ...config, lineGapSeconds: 0.6 })).not.toBe(hash);
    expect(scriptAudioHash(script, { ...config, mp3Kbps: 96 })).not.toBe(hash);
    expect(scriptAudioHash(script, { ...config, languageType: "Chinese" })).not.toBe(hash);
  });
});

describe("resolveAudioUrl", () => {
  const hash = scriptAudioHash(script, config);
  const entry = {
    hash,
    file: `/audio/listening/biz-l-001.${hash}.mp3`,
    model: config.model,
    voices: config.voices,
    generatedAt: "2026-07-18T00:00:00.000Z",
    characters: 55,
  };
  const manifest: AudioManifest = { [listeningManifestKey("biz-l-001")]: entry };

  it("returns the canonical id+hash path when the manifest hash matches", () => {
    expect(resolveAudioUrl("biz-l-001", script, manifest, config)).toBe(entry.file);
  });

  it("derives the path from id + hash even when entry.file lies", () => {
    // A swapped/mangled file field must never route one exercise's player to
    // another's audio; the manifest guard test rejects such manifests in CI.
    const lying: AudioManifest = {
      [listeningManifestKey("biz-l-001")]: { ...entry, file: "/audio/listening/other.mp3" },
    };
    expect(resolveAudioUrl("biz-l-001", script, lying, config)).toBe(entry.file);
  });

  it("returns null for an exercise with no manifest entry", () => {
    expect(resolveAudioUrl("biz-l-999", script, manifest, config)).toBeNull();
  });

  it("returns null when the script changed since generation (stale audio)", () => {
    const edited = [script[0], { ...script[1], text: "Different words entirely." }];
    expect(resolveAudioUrl("biz-l-001", edited, manifest, config)).toBeNull();
  });
});

describe("resolveExamAudioUrl", () => {
  const hash = scriptAudioHash(script, config);
  const manifest: AudioManifest = {
    [examManifestKey("exam-toeic-mini", "tm-lg1")]: {
      hash,
      file: `/audio/exams/exam-toeic-mini.tm-lg1.${hash}.mp3`,
      model: config.model,
      voices: config.voices,
      generatedAt: "2026-07-18T00:00:00.000Z",
      characters: 55,
    },
  };

  it("resolves the canonical exam path on a hash match, null when stale", () => {
    expect(resolveExamAudioUrl("exam-toeic-mini", "tm-lg1", script, manifest, config)).toBe(
      `/audio/exams/exam-toeic-mini.tm-lg1.${hash}.mp3`,
    );
    const edited = [{ ...script[0], text: "changed" }, script[1]];
    expect(resolveExamAudioUrl("exam-toeic-mini", "tm-lg1", edited, manifest, config)).toBeNull();
    expect(resolveExamAudioUrl("exam-toeic-mini", "tm-lg2", script, manifest, config)).toBeNull();
  });
});

describe("vocab headword audio", () => {
  const vc = VOCAB_AUDIO_CONFIG;

  it("wordAudioHash is stable and sensitive to text, voice, and renderer", () => {
    const hash = wordAudioHash("negotiate", vc);
    expect(hash).toBe(wordAudioHash("negotiate", vc));
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
    expect(wordAudioHash("negotiation", vc)).not.toBe(hash);
    expect(wordAudioHash("negotiate", { ...vc, voice: "Neil" })).not.toBe(hash);
    expect(wordAudioHash("negotiate", { ...vc, mp3Kbps: 96 })).not.toBe(hash);
  });

  it("resolveVocabAudioUrl resolves canonically, null on stale headword", () => {
    const hash = wordAudioHash("negotiate", vc);
    const manifest: AudioManifest = {
      [vocabManifestKey("biz-w-001")]: {
        hash,
        file: `/audio/vocab/biz-w-001.${hash}.mp3`,
        model: vc.model,
        voices: { narrator: vc.voice },
        generatedAt: "2026-07-18T00:00:00.000Z",
        characters: 9,
      },
    };
    expect(resolveVocabAudioUrl("biz-w-001", "negotiate", manifest, vc)).toBe(
      `/audio/vocab/biz-w-001.${hash}.mp3`,
    );
    expect(resolveVocabAudioUrl("biz-w-001", "renegotiate", manifest, vc)).toBeNull();
    expect(resolveVocabAudioUrl("biz-w-002", "negotiate", manifest, vc)).toBeNull();
  });
});
