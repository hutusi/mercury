import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "bun:test";
import { AudioManifestSchema, type AudioManifest } from "./audio-hash";

/**
 * Broken states between content/audio-manifest.json and the committed files
 * under public/audio/ fail CI: an entry whose file is gone would 404 at
 * runtime, and an orphan file is dead weight in the repo. A *stale* hash is
 * deliberately not an error — contributors without a DashScope key must be
 * able to edit scripts, and the seed nulls stale links (ADR 0021).
 */

const root = process.cwd();
const manifestPath = path.join(root, "content", "audio-manifest.json");
const audioDir = path.join(root, "public", "audio", "listening");

const manifest: AudioManifest = fs.existsSync(manifestPath)
  ? AudioManifestSchema.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")))
  : {};

describe("audio manifest ↔ committed files", () => {
  it("every manifest entry points at a committed file", () => {
    const missing = Object.entries(manifest)
      .filter(([, entry]) => !fs.existsSync(path.join(root, "public", entry.file)))
      .map(([key, entry]) => `${key} → ${entry.file}`);
    expect(missing).toEqual([]);
  });

  it("every committed audio file has a manifest entry", () => {
    const files = fs.existsSync(audioDir)
      ? fs.readdirSync(audioDir).filter((f) => f.endsWith(".mp3"))
      : [];
    const known = new Set(Object.values(manifest).map((entry) => path.basename(entry.file)));
    expect(files.filter((f) => !known.has(f))).toEqual([]);
  });
});
