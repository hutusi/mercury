import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { allExams, allListening, allReading, allSpeaking, allVocab, allWriting } from "./index";
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
