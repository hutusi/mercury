import fs from "node:fs";
import path from "node:path";
import { Mp3Encoder } from "@breezystack/lamejs";
import { del, head, list, put } from "@vercel/blob";
import {
  AudioManifestSchema,
  LISTENING_AUDIO_CONFIG,
  listeningAudioFile,
  listeningManifestKey,
  scriptAudioHash,
  type AudioManifest,
} from "../src/content/audio-hash";
import { allListening } from "../src/content/load";
import type { ScriptLine } from "../src/content/types";

/**
 * Renders every listening exercise's script to one MP3 via DashScope TTS and
 * uploads it to Vercel Blob (ADR 0021/0022), recording it in
 * content/audio-manifest.json. Idempotent: an exercise whose manifest hash
 * matches its current script (and whose blob exists) is skipped, so re-runs
 * after editing one YAML script only pay for that exercise.
 * public/audio/listening/ is a gitignored local render cache: fresh renders
 * land there too, and a cached file whose hash still matches is uploaded
 * without re-synthesizing (zero DashScope cost).
 *
 * Needs BLOB_READ_WRITE_TOKEN always, DASHSCOPE_API_KEY only when something
 * actually re-renders. Commit the manifest afterwards — audio files are never
 * committed.
 *
 * Tooling-only, like the content loader: the app never talks to DashScope or
 * Blob at runtime — it serves public blob URLs and falls back to browser TTS
 * when an exercise has no (or stale) audio.
 */

const TTS_URL =
  process.env.DASHSCOPE_TTS_URL ??
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
// All settings that shape the sound live in CONFIG — they feed the content
// hash, so changing any of them correctly invalidates every existing render.
const CONFIG = LISTENING_AUDIO_CONFIG;
const MANIFEST_PATH = path.join(process.cwd(), "content", "audio-manifest.json");
const AUDIO_DIR = path.join(process.cwd(), "public", "audio", "listening");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SynthesizedLine {
  samples: Int16Array;
  sampleRate: number;
  characters: number;
}

/** Minimal RIFF/WAVE reader; hard-errors on anything but 16-bit mono PCM. */
function parseWav(bytes: Uint8Array): { samples: Int16Array; sampleRate: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (off: number) =>
    String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
  if (bytes.byteLength < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE") {
    throw new Error("response is not a RIFF/WAVE file");
  }
  let fmt: { format: number; channels: number; sampleRate: number; bits: number } | null = null;
  let data: Uint8Array | null = null;
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      fmt = {
        format: view.getUint16(body, true),
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    } else if (id === "data") {
      data = bytes.subarray(body, Math.min(body + size, bytes.byteLength));
    }
    offset = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("WAV is missing fmt/data chunks");
  if (fmt.format !== 1 || fmt.bits !== 16 || fmt.channels !== 1) {
    throw new Error(
      `unsupported WAV format (want 16-bit mono PCM): format=${fmt.format} bits=${fmt.bits} channels=${fmt.channels}`,
    );
  }
  // slice() realigns the data chunk to byte offset 0 for the Int16Array view.
  const aligned = data.slice();
  return {
    samples: new Int16Array(aligned.buffer, 0, aligned.byteLength >> 1),
    sampleRate: fmt.sampleRate,
  };
}

async function synthesizeLine(line: ScriptLine, apiKey: string): Promise<SynthesizedLine> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(TTS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: CONFIG.model,
          input: {
            text: line.text,
            voice: CONFIG.voices[line.speaker],
            language_type: CONFIG.languageType,
          },
        }),
      });
      if (!res.ok) throw new Error(`TTS request failed: ${res.status} ${await res.text()}`);
      const payload = (await res.json()) as {
        output?: { audio?: { url?: string } };
        usage?: { characters?: number };
      };
      const url = payload.output?.audio?.url;
      if (typeof url !== "string") {
        throw new Error(`unexpected TTS response: ${JSON.stringify(payload).slice(0, 300)}`);
      }
      // The returned URL expires in 24h — download immediately.
      const audio = await fetch(url);
      if (!audio.ok) throw new Error(`audio download failed: ${audio.status}`);
      const wav = parseWav(new Uint8Array(await audio.arrayBuffer()));
      return { ...wav, characters: payload.usage?.characters ?? line.text.length };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

function stitchToMp3(lines: SynthesizedLine[]): Uint8Array {
  const sampleRate = lines[0].sampleRate;
  const mismatch = lines.find((l) => l.sampleRate !== sampleRate);
  if (mismatch) {
    throw new Error(`mixed sample rates in one exercise: ${sampleRate} vs ${mismatch.sampleRate}`);
  }
  const gap = new Int16Array(Math.round(CONFIG.lineGapSeconds * sampleRate));
  const total = lines.reduce((n, l) => n + l.samples.length, 0) + gap.length * (lines.length - 1);
  const pcm = new Int16Array(total);
  let cursor = 0;
  for (const [i, line] of lines.entries()) {
    if (i > 0) cursor += gap.length;
    pcm.set(line.samples, cursor);
    cursor += line.samples.length;
  }

  const encoder = new Mp3Encoder(1, sampleRate, CONFIG.mp3Kbps);
  const chunks: Uint8Array[] = [];
  const blockSize = 1152;
  for (let i = 0; i < pcm.length; i += blockSize) {
    const encoded = encoder.encodeBuffer(pcm.subarray(i, i + blockSize));
    if (encoded.length > 0) chunks.push(new Uint8Array(encoded));
  }
  const flush = encoder.flush();
  if (flush.length > 0) chunks.push(new Uint8Array(flush));

  const mp3 = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    mp3.set(chunk, offset);
    offset += chunk.length;
  }
  return mp3;
}

function loadManifest(): AudioManifest {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  return AudioManifestSchema.parse(JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")));
}

function writeManifest(manifest: AudioManifest) {
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + "\n");
}

/** Blob pathname for an exercise render (no leading slash). */
function blobPathname(exerciseId: string, hash: string): string {
  return listeningAudioFile(exerciseId, hash).slice(1);
}

async function blobExists(pathname: string): Promise<boolean> {
  try {
    await head(pathname);
    return true;
  } catch {
    return false;
  }
}

/** Upload a render; assert Blob kept our canonical pathname; return the store origin. */
async function uploadRender(pathname: string, body: Uint8Array): Promise<string> {
  const result = await put(pathname, Buffer.from(body), {
    access: "public",
    contentType: "audio/mpeg",
    // URLs embed the content hash, so they're immutable — let browsers cache
    // for a year and never revalidate (the "cache on local" contract).
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  const url = new URL(result.url);
  if (url.pathname !== `/${pathname}`) {
    throw new Error(`Blob stored ${result.url}, expected pathname /${pathname}`);
  }
  return url.origin;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set (tooling-time only). Connect the Blob " +
        "store to the project and `vercel env pull`, or copy the token from the store dashboard.",
    );
  }
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const manifest = loadManifest();
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  let generated = 0;
  let uploadedFromCache = 0;
  let skipped = 0;
  let characters = 0;
  let storeOrigin: string | null = null;

  for (const exercise of allListening) {
    const hash = scriptAudioHash(exercise.script, CONFIG);
    const key = listeningManifestKey(exercise.id);
    const pathname = blobPathname(exercise.id, hash);
    const fileName = path.basename(pathname);
    const localPath = path.join(AUDIO_DIR, fileName);
    const entry = manifest[key];
    const fresh = entry?.hash === hash;

    if (fresh && (await blobExists(pathname))) {
      skipped++;
      continue;
    }

    let mp3: Uint8Array;
    let entryCharacters = entry?.characters ?? 0;
    if (fresh && fs.existsSync(localPath)) {
      // Local render cache hit: same hash, blob just missing — upload as-is.
      mp3 = fs.readFileSync(localPath);
      uploadedFromCache++;
      console.log(`uploaded ${fileName} from local cache (no synthesis)`);
    } else {
      if (!apiKey) {
        throw new Error(
          `DASHSCOPE_API_KEY is not set but ${exercise.id} needs (re)generation. ` +
            "Set the key (tooling-time only) and re-run bun run content:audio.",
        );
      }
      // Sequential on purpose: DashScope QPS limits are undocumented.
      const lines: SynthesizedLine[] = [];
      for (const line of exercise.script) {
        lines.push(await synthesizeLine(line, apiKey));
      }
      mp3 = stitchToMp3(lines);
      fs.writeFileSync(localPath, mp3);
      entryCharacters = lines.reduce((n, l) => n + l.characters, 0);
      characters += entryCharacters;
      generated++;
      console.log(`generated ${fileName} (${exercise.script.length} lines)`);
    }

    storeOrigin = await uploadRender(pathname, mp3);
    // Drop superseded renders of this exercise (ids never contain dots).
    for (const stale of fs.readdirSync(AUDIO_DIR)) {
      if (stale.startsWith(`${exercise.id}.`) && stale !== fileName) {
        fs.unlinkSync(path.join(AUDIO_DIR, stale));
      }
    }
    const superseded = await list({ prefix: `audio/listening/${exercise.id}.` });
    await Promise.all(
      superseded.blobs.filter((b) => b.pathname !== pathname).map((b) => del(b.url)),
    );

    manifest[key] = {
      hash,
      file: listeningAudioFile(exercise.id, hash),
      model: CONFIG.model,
      voices: CONFIG.voices,
      generatedAt: new Date().toISOString(),
      characters: entryCharacters,
    };
    writeManifest(manifest); // persist per exercise so a mid-run failure loses nothing
  }

  // Prune exercises that no longer exist in the content set (manifest, local
  // cache, and blobs).
  const liveKeys = new Set(allListening.map((e) => listeningManifestKey(e.id)));
  for (const [key, entry] of Object.entries(manifest)) {
    if (key.startsWith("listening:") && !liveKeys.has(key)) {
      const local = path.join(process.cwd(), "public", entry.file);
      if (fs.existsSync(local)) fs.unlinkSync(local);
      const id = key.slice("listening:".length);
      const stale = await list({ prefix: `audio/listening/${id}.` });
      await Promise.all(stale.blobs.map((b) => del(b.url)));
      delete manifest[key];
      console.log(`pruned ${key} (exercise removed from content)`);
    }
  }
  writeManifest(manifest);

  // Verification sweep: every manifest entry must be publicly fetchable, and
  // no orphan blobs may linger under the listening prefix.
  const missing: string[] = [];
  for (const [key, entry] of Object.entries(manifest)) {
    if (!(await blobExists(entry.file.slice(1)))) missing.push(`${key} → ${entry.file}`);
  }
  if (missing.length > 0) {
    throw new Error(`manifest entries missing from Blob:\n${missing.join("\n")}`);
  }
  const known = new Set(Object.values(manifest).map((e) => e.file.slice(1)));
  const all = await list({ prefix: "audio/listening/" });
  for (const orphan of all.blobs.filter((b) => !known.has(b.pathname))) {
    await del(orphan.url);
    console.log(`deleted orphan blob ${orphan.pathname}`);
  }

  console.log(
    `Audio generation complete: ${generated} synthesized, ${uploadedFromCache} uploaded from cache, ` +
      `${skipped} up to date` +
      (characters > 0 ? `, ${characters} billed characters` : ""),
  );
  if (storeOrigin) {
    console.log(`Audio serves from ${storeOrigin} — MERCURY_AUDIO_BASE_URL must be set to it.`);
  }
}

main().catch((error) => {
  console.error("Audio generation failed:", error);
  process.exit(1);
});
