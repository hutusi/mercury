import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { AudioManifestSchema, type AudioManifest } from "./audio-hash";
import {
  BookChapterSchema,
  BookManifestSchema,
  ListeningExerciseSchema,
  MockExamSchema,
  ReadingExerciseSchema,
  SpeakingPromptSchema,
  VocabWordSchema,
  WritingPromptSchema,
  type Book,
} from "./types";

/**
 * Loads the authored content from content/**.yaml and validates it against
 * the zod content model. Tooling-only (seed script and unit tests): the app
 * reads content from Postgres at runtime, and this module touches node:fs,
 * so it must never be imported from app code — content.test.ts enforces that.
 */

// cwd-relative like migrate.ts ("./drizzle"): every entry point (bun test,
// db:seed via tsx, the e2e web server, CI) runs from the repo root.
const CONTENT_DIR = path.join(process.cwd(), "content");

function loadFile<T>(rel: string, schema: z.ZodType<T>): T {
  const raw: unknown = parse(fs.readFileSync(path.join(CONTENT_DIR, rel), "utf8"));
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`content/${rel} failed validation:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

// File order is load-bearing (vocab sortOrder derives from array position at
// seed time), so it is hardcoded — never directory order.
const TRACK_FILES = ["toeic.yaml", "ielts.yaml", "business.yaml"] as const;

function loadTracked<T>(dir: string, schema: z.ZodType<T>): T[] {
  return TRACK_FILES.flatMap((file) => loadFile(`${dir}/${file}`, z.array(schema)));
}

export const allVocab = loadTracked("vocab", VocabWordSchema);
export const allReading = loadTracked("reading", ReadingExerciseSchema);
export const allListening = loadTracked("listening", ListeningExerciseSchema);
export const allWriting = loadTracked("writing", WritingPromptSchema);
export const allSpeaking = loadTracked("speaking", SpeakingPromptSchema);
export const allExams = [
  "exams/toeic-mini.yaml",
  "exams/toeic-standard.yaml",
  "exams/toeic-standard-2.yaml",
  "exams/ielts-mini.yaml",
  "exams/ielts-standard.yaml",
  "exams/ielts-standard-2.yaml",
].map((file) => loadFile(file, MockExamSchema));

// Chapter order derives from the manifest's chapterFiles array position, so
// each book directory owns its own ordering; only the directory list is here.
const BOOK_DIRS = ["the-wonderful-wizard-of-oz"] as const;

export const allBooks: Book[] = BOOK_DIRS.map((dir) => {
  const { chapterFiles, ...manifest } = loadFile(`books/${dir}/book.yaml`, BookManifestSchema);
  const chapters = chapterFiles.map((file) => {
    const chapter = loadFile(`books/${dir}/chapters/${file}`, BookChapterSchema);
    if (chapter.bookId !== manifest.id) {
      throw new Error(
        `content/books/${dir}/chapters/${file}: bookId ${chapter.bookId} != ${manifest.id}`,
      );
    }
    return chapter;
  });
  return { ...manifest, chapters };
});

// Machine-written by `bun run content:audio` (ADR 0021); absent until audio
// is first generated, and tolerated — exercises then seed without audio.
const MANIFEST_PATH = path.join(CONTENT_DIR, "audio-manifest.json");
export const audioManifest: AudioManifest = fs.existsSync(MANIFEST_PATH)
  ? AudioManifestSchema.parse(JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")))
  : {};
