import fs from "node:fs";
import path from "node:path";
import { Mp3Encoder } from "@breezystack/lamejs";
import {
  AudioManifestSchema,
  LISTENING_AUDIO_CONFIG,
  listeningManifestKey,
  scriptAudioHash,
  type AudioManifest,
} from "../src/content/audio-hash";
import { allListening } from "../src/content/load";
import type { ScriptLine } from "../src/content/types";

/**
 * Renders every listening exercise's script to one MP3 via DashScope TTS
 * (ADR 0021) and records it in content/audio-manifest.json. Idempotent:
 * an exercise whose manifest hash matches its current script (and whose file
 * exists) is skipped, so re-runs after editing one YAML script only pay for
 * that exercise. Run `bun run content:audio` with DASHSCOPE_API_KEY set, then
 * commit the MP3s and the manifest together.
 *
 * Tooling-only, like the content loader: the app itself never calls DashScope
 * TTS — it serves the committed files and falls back to browser TTS when an
 * exercise has no (or stale) audio.
 */

const TTS_URL =
  process.env.DASHSCOPE_TTS_URL ??
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
const CONFIG = LISTENING_AUDIO_CONFIG;
const MANIFEST_PATH = path.join(process.cwd(), "content", "audio-manifest.json");
const AUDIO_DIR = path.join(process.cwd(), "public", "audio", "listening");
const LINE_GAP_SECONDS = 0.4;
const MP3_KBPS = 64;

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
          input: { text: line.text, voice: CONFIG.voices[line.speaker], language_type: "English" },
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
  const gap = new Int16Array(Math.round(LINE_GAP_SECONDS * sampleRate));
  const total = lines.reduce((n, l) => n + l.samples.length, 0) + gap.length * (lines.length - 1);
  const pcm = new Int16Array(total);
  let cursor = 0;
  for (const [i, line] of lines.entries()) {
    if (i > 0) cursor += gap.length;
    pcm.set(line.samples, cursor);
    cursor += line.samples.length;
  }

  const encoder = new Mp3Encoder(1, sampleRate, MP3_KBPS);
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

async function main() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  const manifest = loadManifest();
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  let generated = 0;
  let skipped = 0;
  let characters = 0;

  for (const exercise of allListening) {
    const hash = scriptAudioHash(exercise.script, CONFIG);
    const key = listeningManifestKey(exercise.id);
    const fileName = `${exercise.id}.${hash}.mp3`;
    const entry = manifest[key];
    if (entry?.hash === hash && fs.existsSync(path.join(AUDIO_DIR, fileName))) {
      skipped++;
      continue;
    }
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
    fs.writeFileSync(path.join(AUDIO_DIR, fileName), stitchToMp3(lines));
    // Drop superseded renders of this exercise (ids never contain dots).
    for (const stale of fs.readdirSync(AUDIO_DIR)) {
      if (stale.startsWith(`${exercise.id}.`) && stale !== fileName) {
        fs.unlinkSync(path.join(AUDIO_DIR, stale));
      }
    }
    const lineCharacters = lines.reduce((n, l) => n + l.characters, 0);
    manifest[key] = {
      hash,
      file: `/audio/listening/${fileName}`,
      model: CONFIG.model,
      voices: CONFIG.voices,
      generatedAt: new Date().toISOString(),
      characters: lineCharacters,
    };
    writeManifest(manifest); // persist per exercise so a mid-run failure loses nothing
    generated++;
    characters += lineCharacters;
    console.log(`generated ${fileName} (${exercise.script.length} lines)`);
  }

  // Prune renders whose exercise no longer exists in the content set.
  const liveKeys = new Set(allListening.map((e) => listeningManifestKey(e.id)));
  for (const [key, entry] of Object.entries(manifest)) {
    if (key.startsWith("listening:") && !liveKeys.has(key)) {
      const file = path.join(process.cwd(), "public", entry.file);
      if (fs.existsSync(file)) fs.unlinkSync(file);
      delete manifest[key];
      console.log(`pruned ${key} (exercise removed from content)`);
    }
  }

  writeManifest(manifest);
  console.log(
    `Audio generation complete: ${generated} generated, ${skipped} up to date` +
      (characters > 0 ? `, ${characters} billed characters` : ""),
  );
}

main().catch((error) => {
  console.error("Audio generation failed:", error);
  process.exit(1);
});
