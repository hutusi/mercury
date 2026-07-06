import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import {
  ListeningExerciseSchema,
  MockExamSchema,
  ReadingExerciseSchema,
  SpeakingPromptSchema,
  VocabWordSchema,
  WritingPromptSchema,
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
export const allExams = ["exams/toeic-mini.yaml", "exams/ielts-mini.yaml"].map((file) =>
  loadFile(file, MockExamSchema),
);
