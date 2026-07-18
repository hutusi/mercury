import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "bun:test";
import {
  AudioManifestSchema,
  examAudioFile,
  listeningAudioFile,
  vocabAudioFile,
  type AudioManifest,
} from "./audio-hash";

/**
 * The manifest is the seed's source of truth for Blob-hosted audio
 * (ADR 0022). Structural breakage fails CI here; *existence* on Blob is
 * verified tooling-time by the content:audio sweep (unit tests stay
 * network-free). A *stale* hash is deliberately not an error — contributors
 * without keys must be able to edit scripts, and the seed nulls stale links.
 */

const manifestPath = path.join(process.cwd(), "content", "audio-manifest.json");

const manifest: AudioManifest = fs.existsSync(manifestPath)
  ? AudioManifestSchema.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")))
  : {};

/** The canonical file for a manifest key, or null for an unknown namespace. */
function canonicalFile(key: string, hash: string): string | null {
  if (key.startsWith("listening:")) return listeningAudioFile(key.slice("listening:".length), hash);
  if (key.startsWith("vocab:")) return vocabAudioFile(key.slice("vocab:".length), hash);
  if (key.startsWith("exam:")) {
    const [, examId, groupId] = key.split(":");
    return examId && groupId ? examAudioFile(examId, groupId, hash) : null;
  }
  return null;
}

describe("audio manifest integrity", () => {
  it("every entry's key and file follow the canonical id/hash mapping", () => {
    // The resolvers derive paths from id + hash, so a manifest whose file
    // fields were swapped or hand-mangled must fail here, not play wrongly.
    const broken = Object.entries(manifest)
      .filter(([key, entry]) => entry.file !== canonicalFile(key, entry.hash))
      .map(([key, entry]) => `${key} → ${entry.file}`);
    expect(broken).toEqual([]);
  });
});
