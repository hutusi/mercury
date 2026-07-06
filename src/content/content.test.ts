import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { buildContentSchemas } from "../../scripts/generate-content-schemas";
import { allExams, allListening, allReading, allSpeaking, allVocab, allWriting } from "./load";
import {
  examQuestionCount,
  ListeningExerciseSchema,
  MockExamSchema,
  ReadingExerciseSchema,
  SpeakingPromptSchema,
  TRACKS,
  VocabWordSchema,
  WritingPromptSchema,
} from "./types";

const collections = [
  { name: "vocab", schema: VocabWordSchema, items: allVocab },
  { name: "reading", schema: ReadingExerciseSchema, items: allReading },
  { name: "listening", schema: ListeningExerciseSchema, items: allListening },
  { name: "writing", schema: WritingPromptSchema, items: allWriting },
  { name: "speaking", schema: SpeakingPromptSchema, items: allSpeaking },
  { name: "exams", schema: MockExamSchema, items: allExams },
] as const;

describe("seed content", () => {
  for (const { name, schema, items } of collections) {
    test(`${name}: every item parses against its zod schema`, () => {
      expect(() => z.array(schema).parse(items)).not.toThrow();
    });

    test(`${name}: ids are unique`, () => {
      const ids = items.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }

  test("every track has content in all five practice areas", () => {
    for (const track of TRACKS) {
      expect(allVocab.some((w) => w.track === track)).toBe(true);
      expect(allReading.some((e) => e.track === track)).toBe(true);
      expect(allListening.some((e) => e.track === track)).toBe(true);
      expect(allWriting.some((p) => p.track === track)).toBe(true);
      expect(allSpeaking.some((p) => p.track === track)).toBe(true);
    }
  });
});

describe("mock exams", () => {
  for (const exam of allExams) {
    test(`${exam.id}: question ids are unique across the whole exam`, () => {
      // Question ids are answer-map keys — a duplicate would silently merge answers.
      const qids = exam.sections.flatMap((s) =>
        s.groups.flatMap((g) => g.questions.map((q) => q.id)),
      );
      expect(new Set(qids).size).toBe(qids.length);
    });

    test(`${exam.id}: has both listening and reading sections`, () => {
      // The TOEIC estimator sums per-kind sections; a missing kind would map to 5.
      expect(exam.sections.some((s) => s.kind === "listening")).toBe(true);
      expect(exam.sections.some((s) => s.kind === "reading")).toBe(true);
    });

    test(`${exam.id}: examQuestionCount matches the flattened count`, () => {
      const flat = exam.sections.reduce(
        (n, s) => n + s.groups.reduce((m, g) => m + g.questions.length, 0),
        0,
      );
      expect(examQuestionCount(exam)).toBe(flat);
    });

    test(`${exam.id}: listening groups carry scripts, reading groups carry passages`, () => {
      for (const section of exam.sections) {
        for (const group of section.groups) {
          if (section.kind === "listening") {
            expect(group.script?.length ?? 0).toBeGreaterThan(0);
          } else {
            expect((group.passage ?? "").length).toBeGreaterThan(0);
          }
        }
      }
    });
  }
});

describe("content pipeline guard", () => {
  test("app code never imports the loader (runtime content comes from Postgres)", () => {
    // load.ts touches node:fs; a client import would break the build cryptically.
    // Only tooling may use it: the seed script and test files.
    const roots = ["src/app", "src/components", "src/lib"];
    const allowed = new Set([path.join("src", "lib", "db", "seed.ts")]);
    const offenders: string[] = [];
    for (const root of roots) {
      const abs = path.join(process.cwd(), root);
      for (const rel of fs.readdirSync(abs, { recursive: true }) as string[]) {
        if (!/\.(ts|tsx)$/.test(rel) || /\.(test|spec)\.(ts|tsx)$/.test(rel)) continue;
        const file = path.join(root, rel);
        if (allowed.has(file)) continue;
        const text = fs.readFileSync(path.join(abs, rel), "utf8");
        if (/from\s+["'][^"']*content\/load["']/.test(text)) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("committed JSON Schemas match the zod content model", () => {
    // Editor validation reads content/.schemas/*.json; zod is the source of
    // truth. Fails when types.ts changes without `bun run content:schemas`.
    for (const [name, generated] of Object.entries(buildContentSchemas())) {
      const committed: unknown = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "content", ".schemas", name), "utf8"),
      );
      expect(committed).toEqual(generated as never);
    }
  });
});
