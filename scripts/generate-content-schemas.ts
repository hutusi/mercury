import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  ListeningExerciseSchema,
  MockExamSchema,
  ReadingExerciseSchema,
  SpeakingPromptSchema,
  VocabWordSchema,
  WritingPromptSchema,
} from "../src/content/types";

/**
 * JSON Schemas for the YAML content files under content/, derived from the
 * zod schemas in src/content/types.ts. They exist purely for editor feedback
 * (yaml-language-server reads the $schema directive at the top of each file);
 * zod remains the enforcement layer at test and seed time.
 *
 * Regenerate with `bun run content:schemas` whenever types.ts changes —
 * content.test.ts fails if the committed files drift from the zod source.
 */

// Exported so content.test.ts can assert the committed files are in sync.
export function buildContentSchemas(): Record<string, unknown> {
  // yaml-language-server is draft-07-first.
  const opts = { target: "draft-07" } as const;
  return {
    "vocab.schema.json": z.toJSONSchema(z.array(VocabWordSchema), opts),
    "reading.schema.json": z.toJSONSchema(z.array(ReadingExerciseSchema), opts),
    "listening.schema.json": z.toJSONSchema(z.array(ListeningExerciseSchema), opts),
    "writing.schema.json": z.toJSONSchema(z.array(WritingPromptSchema), opts),
    "speaking.schema.json": z.toJSONSchema(z.array(SpeakingPromptSchema), opts),
    // Exam files hold a single exam object, not an array.
    "exam.schema.json": z.toJSONSchema(MockExamSchema, opts),
  };
}

if (import.meta.main) {
  const dir = path.join(process.cwd(), "content", ".schemas");
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, schema] of Object.entries(buildContentSchemas())) {
    fs.writeFileSync(path.join(dir, name), JSON.stringify(schema, null, 2) + "\n");
  }
  console.log("Wrote 6 schemas to content/.schemas/");
}
