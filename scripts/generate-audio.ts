import fs from "node:fs";
import path from "node:path";
import { Mp3Encoder } from "@breezystack/lamejs";
import { BlobNotFoundError, del, head, list, put } from "@vercel/blob";
import {
  examAudioFile,
  examManifestKey,
  LISTENING_AUDIO_CONFIG,
  listeningAudioFile,
  listeningManifestKey,
  scriptAudioHash,
  VOCAB_AUDIO_CONFIG,
  vocabAudioFile,
  vocabManifestKey,
  wordAudioHash,
  type AudioManifest,
  AudioManifestSchema,
} from "../src/content/audio-hash";
import { allExams, allListening, allVocab } from "../src/content/load";
import type { ScriptLine } from "../src/content/types";

/**
 * Renders all pre-generated audio via DashScope TTS and uploads it to Vercel
 * Blob (ADR 0021/0022/0023), recording everything in
 * content/audio-manifest.json: listening-exercise scripts, mock-exam
 * listening-group scripts, and vocab headwords. Idempotent: an item whose
 * manifest hash matches its current content (and whose blob exists) is
 * skipped, so re-runs after editing one YAML file only pay for that item.
 * public/audio/ is a gitignored local render cache: fresh renders land there
 * too, and a cached file whose hash-bearing name still matches is uploaded
 * without re-synthesizing (zero DashScope cost).
 *
 * Needs BLOB_READ_WRITE_TOKEN always, DASHSCOPE_API_KEY only when something
 * actually re-renders. Commit the manifest afterwards — audio files are never
 * committed.
 *
 * Default runs never delete blobs: deployed environments keep referencing the
 * previous hash until their database is reseeded, so superseded renders must
 * outlive generation. Run `bun run content:audio:prune` (--prune) to sweep
 * unreferenced blobs — only after the manifest has deployed AND the prod seed
 * has run.
 *
 * Tooling-only, like the content loader: the app never talks to DashScope or
 * Blob at runtime — it serves public blob URLs and falls back to browser TTS
 * when an item has no (or stale) audio.
 */

const TTS_URL =
  process.env.DASHSCOPE_TTS_URL ??
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
// All settings that shape the sound live in these configs — they feed the
// content hashes, so changing any of them correctly invalidates renders.
const SCRIPT_CONFIG = LISTENING_AUDIO_CONFIG;
const WORD_CONFIG = VOCAB_AUDIO_CONFIG;
const MANIFEST_PATH = path.join(process.cwd(), "content", "audio-manifest.json");

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

async function synthesizeUtterance(
  text: string,
  voice: string,
  model: string,
  languageType: string,
  apiKey: string,
): Promise<SynthesizedLine> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(TTS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: { text, voice, language_type: languageType } }),
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
      return { ...wav, characters: payload.usage?.characters ?? text.length };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

function encodeMp3(lines: SynthesizedLine[], gapSeconds: number, kbps: number): Uint8Array {
  const sampleRate = lines[0].sampleRate;
  const mismatch = lines.find((l) => l.sampleRate !== sampleRate);
  if (mismatch) {
    throw new Error(`mixed sample rates in one render: ${sampleRate} vs ${mismatch.sampleRate}`);
  }
  const gap = new Int16Array(Math.round(gapSeconds * sampleRate));
  const total = lines.reduce((n, l) => n + l.samples.length, 0) + gap.length * (lines.length - 1);
  const pcm = new Int16Array(total);
  let cursor = 0;
  for (const [i, line] of lines.entries()) {
    if (i > 0) cursor += gap.length;
    pcm.set(line.samples, cursor);
    cursor += line.samples.length;
  }

  const encoder = new Mp3Encoder(1, sampleRate, kbps);
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

/** Synthesize a dialogue script with the shared cast and inter-line pauses. */
async function synthesizeScript(
  script: ScriptLine[],
  apiKey: string,
): Promise<{ mp3: Uint8Array; characters: number }> {
  // Sequential on purpose: DashScope QPS limits are undocumented.
  const lines: SynthesizedLine[] = [];
  for (const line of script) {
    lines.push(
      await synthesizeUtterance(
        line.text,
        SCRIPT_CONFIG.voices[line.speaker],
        SCRIPT_CONFIG.model,
        SCRIPT_CONFIG.languageType,
        apiKey,
      ),
    );
  }
  return {
    mp3: encodeMp3(lines, SCRIPT_CONFIG.lineGapSeconds, SCRIPT_CONFIG.mp3Kbps),
    characters: lines.reduce((n, l) => n + l.characters, 0),
  };
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

async function blobExists(pathname: string): Promise<boolean> {
  try {
    await head(pathname);
    return true;
  } catch (error) {
    // Only a confirmed miss means "regenerate". Auth failures, rate limits,
    // and outages must propagate — treating them as missing would trigger
    // paid re-synthesis for files that exist.
    if (error instanceof BlobNotFoundError) return false;
    throw error;
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

/** One render target: its manifest key, canonical file, and synthesis recipe. */
interface RenderJob {
  key: string;
  hash: string;
  file: string; // canonical /audio/... path (hash embedded in the filename)
  model: string;
  voices: Record<string, string>;
  synthesize: (apiKey: string) => Promise<{ mp3: Uint8Array; characters: number }>;
}

function buildJobs(): RenderJob[] {
  const jobs: RenderJob[] = [];
  for (const exercise of allListening) {
    const hash = scriptAudioHash(exercise.script, SCRIPT_CONFIG);
    jobs.push({
      key: listeningManifestKey(exercise.id),
      hash,
      file: listeningAudioFile(exercise.id, hash),
      model: SCRIPT_CONFIG.model,
      voices: SCRIPT_CONFIG.voices,
      synthesize: (apiKey) => synthesizeScript(exercise.script, apiKey),
    });
  }
  for (const exam of allExams) {
    for (const section of exam.sections) {
      for (const group of section.groups) {
        if (!group.script) continue;
        const script = group.script;
        const hash = scriptAudioHash(script, SCRIPT_CONFIG);
        jobs.push({
          key: examManifestKey(exam.id, group.id),
          hash,
          file: examAudioFile(exam.id, group.id, hash),
          model: SCRIPT_CONFIG.model,
          voices: SCRIPT_CONFIG.voices,
          synthesize: (apiKey) => synthesizeScript(script, apiKey),
        });
      }
    }
  }
  for (const word of allVocab) {
    const hash = wordAudioHash(word.headword, WORD_CONFIG);
    jobs.push({
      key: vocabManifestKey(word.id),
      hash,
      file: vocabAudioFile(word.id, hash),
      model: WORD_CONFIG.model,
      voices: { narrator: WORD_CONFIG.voice },
      synthesize: async (apiKey) => {
        const line = await synthesizeUtterance(
          word.headword,
          WORD_CONFIG.voice,
          WORD_CONFIG.model,
          WORD_CONFIG.languageType,
          apiKey,
        );
        return { mp3: encodeMp3([line], 0, WORD_CONFIG.mp3Kbps), characters: line.characters };
      },
    });
  }
  return jobs;
}

const counters = { synthesized: 0, uploadedFromCache: 0, skipped: 0, characters: 0 };
let storeOrigin: string | null = null;

async function processJob(job: RenderJob, manifest: AudioManifest, apiKey: string | undefined) {
  const pathname = job.file.slice(1);
  const localPath = path.join(process.cwd(), "public", job.file);
  const fileName = path.basename(job.file);
  const entry = manifest[job.key];
  const fresh = entry?.hash === job.hash;

  if (fresh && (await blobExists(pathname))) {
    counters.skipped++;
    return;
  }

  let mp3: Uint8Array;
  let entryCharacters = entry?.characters ?? 0;
  if (fs.existsSync(localPath)) {
    // The cache filename embeds the content hash, so its existence alone
    // proves freshness — no manifest check. This also makes a
    // synthesis-succeeded/upload-failed run resumable without re-paying.
    mp3 = fs.readFileSync(localPath);
    counters.uploadedFromCache++;
    console.log(`uploaded ${fileName} from local cache (no synthesis)`);
  } else {
    if (!apiKey) {
      throw new Error(
        `DASHSCOPE_API_KEY is not set but ${job.key} needs (re)generation. ` +
          "Set the key (tooling-time only) and re-run bun run content:audio.",
      );
    }
    const result = await job.synthesize(apiKey);
    mp3 = result.mp3;
    entryCharacters = result.characters;
    counters.characters += result.characters;
    counters.synthesized++;
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, mp3);
    console.log(`generated ${fileName}`);
  }

  storeOrigin = await uploadRender(pathname, mp3);

  // Drop superseded local-cache renders (author's machine only). Superseded
  // BLOBS are deliberately kept until content:audio:prune (see header).
  const stalePrefix = `${fileName.slice(0, fileName.length - job.hash.length - 5)}.`;
  const dir = path.dirname(localPath);
  for (const stale of fs.readdirSync(dir)) {
    if (stale.startsWith(stalePrefix) && stale !== fileName) {
      fs.unlinkSync(path.join(dir, stale));
    }
  }

  manifest[job.key] = {
    hash: job.hash,
    file: job.file,
    model: job.model,
    voices: job.voices,
    generatedAt: new Date().toISOString(),
    characters: entryCharacters,
  };
  writeManifest(manifest); // persist per item so a mid-run failure loses nothing
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
  const jobs = buildJobs();

  for (const job of jobs) {
    await processJob(job, manifest, apiKey);
  }

  // Drop manifest entries (and local cache) for content that no longer
  // exists. Their blobs stay until content:audio:prune.
  const liveKeys = new Set(jobs.map((j) => j.key));
  for (const [key, entry] of Object.entries(manifest)) {
    if (!liveKeys.has(key)) {
      const local = path.join(process.cwd(), "public", entry.file);
      if (fs.existsSync(local)) fs.unlinkSync(local);
      delete manifest[key];
      console.log(`pruned ${key} from manifest (content removed)`);
    }
  }
  writeManifest(manifest);

  // Verification sweep: every manifest entry must be publicly fetchable.
  const missing: string[] = [];
  for (const [key, entry] of Object.entries(manifest)) {
    if (!(await blobExists(entry.file.slice(1)))) missing.push(`${key} → ${entry.file}`);
  }
  if (missing.length > 0) {
    throw new Error(`manifest entries missing from Blob:\n${missing.join("\n")}`);
  }

  // Blob deletion happens ONLY under --prune (content:audio:prune): deployed
  // environments reference old hashes until their seed runs, so sweeping
  // superseded/orphaned blobs is safe only after the manifest has deployed
  // AND the prod seed has run.
  if (process.argv.includes("--prune")) {
    const known = new Set(Object.values(manifest).map((e) => e.file.slice(1)));
    let pruned = 0;
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: "audio/", cursor });
      for (const orphan of page.blobs.filter((b) => !known.has(b.pathname))) {
        await del(orphan.url);
        pruned++;
        console.log(`deleted unreferenced blob ${orphan.pathname}`);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    console.log(`Prune complete: ${pruned} unreferenced blob(s) deleted.`);
  }

  console.log(
    `Audio generation complete: ${counters.synthesized} synthesized, ` +
      `${counters.uploadedFromCache} uploaded from cache, ${counters.skipped} up to date` +
      (counters.characters > 0 ? `, ${counters.characters} billed characters` : ""),
  );
  if (storeOrigin) {
    console.log(`Audio serves from ${storeOrigin} — MERCURY_AUDIO_BASE_URL must be set to it.`);
  }
}

main().catch((error) => {
  console.error("Audio generation failed:", error);
  process.exit(1);
});
