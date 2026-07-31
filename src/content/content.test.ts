import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { buildContentSchemas } from "../../scripts/generate-content-schemas";
import {
  allBooks,
  allExams,
  allListening,
  allReading,
  allSpeaking,
  allVocab,
  allWriting,
} from "./load";
import {
  BookChapterSchema,
  chapterWordCount,
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

  test("vocab: headwords are unique within a track", () => {
    // Ids are guarded above, but nothing else stops the same word being added
    // twice under two ids — the likeliest authoring mistake as vocab grows.
    for (const track of TRACKS) {
      const headwords = allVocab
        .filter((w) => w.track === track)
        .map((w) => w.headword.toLowerCase());
      expect(new Set(headwords).size).toBe(headwords.length);
    }
  });

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

describe("books", () => {
  test("book ids are unique", () => {
    const ids = allBooks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("chapter ids are unique across all books", () => {
    const ids = allBooks.flatMap((b) => b.chapters.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const book of allBooks) {
    test(`${book.id}: chapters parse and belong to the book`, () => {
      for (const chapter of book.chapters) {
        expect(() => BookChapterSchema.parse(chapter)).not.toThrow();
        expect(chapter.bookId).toBe(book.id);
      }
    });

    test(`${book.id}: section ids are unique within each chapter`, () => {
      for (const chapter of book.chapters) {
        const ids = chapter.sections.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });

    test(`${book.id}: question ids are unique across check-ins and quiz per chapter`, () => {
      // Question ids key the attempt answer map and mistake_states — a
      // duplicate would silently merge answers, like exam question ids.
      for (const chapter of book.chapters) {
        const qids = [
          ...chapter.sections.flatMap((s) => (s.checkIn ? [s.checkIn.id] : [])),
          ...chapter.quiz.map((q) => q.id),
        ];
        expect(new Set(qids).size).toBe(qids.length);
      }
    });

    test(`${book.id}: every chapter has prose`, () => {
      for (const chapter of book.chapters) {
        expect(chapterWordCount(chapter)).toBeGreaterThan(0);
      }
    });

    test(`${book.id}: correct answers are spread across option positions`, () => {
      // Position bias is gameable, and a learner sees one chapter's quiz at
      // a time, so balance must hold per chapter, not just pooled (review
      // findings: D held ~5% pooled; later a chapter quiz was 4/5 D).
      const positions = [0, 0, 0, 0];
      const violations: string[] = [];
      for (const chapter of book.chapters) {
        const questions = [
          ...chapter.sections.flatMap((s) => (s.checkIn ? [s.checkIn] : [])),
          ...chapter.quiz,
        ];
        for (const q of questions) positions[q.correctIndex] += 1;

        const quizCounts = [0, 0, 0, 0];
        for (const q of chapter.quiz) quizCounts[q.correctIndex] += 1;
        const n = chapter.quiz.length;
        const cap = Math.ceil(n / 4);
        const distinct = quizCounts.filter((c) => c > 0).length;
        if (distinct < Math.min(n, 4)) {
          violations.push(`${chapter.id}: quiz uses ${distinct} positions for ${n} questions`);
        }
        for (const [position, count] of quizCounts.entries()) {
          if (count > cap) {
            violations.push(`${chapter.id}: position ${position} holds ${count}/${n} (cap ${cap})`);
          }
        }
      }
      expect(violations).toEqual([]);

      const total = positions.reduce((a, b) => a + b, 0);
      if (total >= 40) {
        for (const [position, count] of positions.entries()) {
          const share = count / total;
          const label = `position ${position} holds ${count}/${total} correct answers`;
          expect(share, label).toBeGreaterThanOrEqual(0.15);
          // Floor alone still admits a 55/15/15/15 split — cap the peak too.
          expect(share, label).toBeLessThanOrEqual(0.35);
        }
      }
    });

    test(`${book.id}: correct options are not a length tell`, () => {
      // A verbose correct answer is as gameable as a position bias: before
      // remediation the correct option was uniquely longest in 66-79% of
      // questions per book (baseline 25%). Cap the flagrant per-question
      // ratio everywhere and the pooled share once a book is big enough.
      // Mirrored in scripts/generate-book-questions.ts (draft-time warning).
      const violations: string[] = [];
      let uniquelyLongest = 0;
      let total = 0;
      for (const chapter of book.chapters) {
        const questions = [
          ...chapter.sections.flatMap((s) => (s.checkIn ? [s.checkIn] : [])),
          ...chapter.quiz,
        ];
        for (const q of questions) {
          total += 1;
          const lengths = q.options.map((o) => o.length);
          const correct = lengths[q.correctIndex];
          const longestDistractor = Math.max(...lengths.filter((_, i) => i !== q.correctIndex));
          if (correct > longestDistractor) uniquelyLongest += 1;
          if (correct > longestDistractor * 1.6) {
            violations.push(
              `${q.id}: correct option is ${correct} chars vs longest distractor ${longestDistractor}`,
            );
          }
        }
      }
      expect(violations).toEqual([]);
      if (total >= 40) {
        const share = uniquelyLongest / total;
        const label = `${uniquelyLongest}/${total} correct options are uniquely longest`;
        expect(share, label).toBeLessThanOrEqual(0.45);
      }
    });

    test(`${book.id}: explanations never reference options by position`, () => {
      // Option order is tooling-assigned and may be reassigned; an
      // explanation saying 选项A/第一个选项/答案为 B breaks silently on any
      // reorder, so distractors must be dismissed by content instead.
      // Mirrored in scripts/generate-book-questions.ts (draft-time warning).
      const positional =
        /(?:选项|答案)\s*(?:是|为)?\s*[0-9０-９①-⑩]|(?:选项|答案)\s*(?:是|为)?\s*[A-D](?![A-Za-z])|第\s*(?:[0-9０-９]+|[一二三四五六七八九十])\s*(?:个)?\s*(?:选项|答案)|option\s*[0-9]|option\s+[a-d](?![a-z])|(?:first|second|third|fourth)\s+option/i;
      const offenders: string[] = [];
      for (const chapter of book.chapters) {
        const questions = [
          ...chapter.sections.flatMap((s) => (s.checkIn ? [s.checkIn] : [])),
          ...chapter.quiz,
        ];
        for (const q of questions) {
          if (positional.test(q.explanationZh)) offenders.push(q.id);
        }
      }
      expect(offenders).toEqual([]);
    });
  }
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
    // Only tooling may use it: the seed script and test files. Scan all of src/
    // so a future directory can't bypass the guard.
    const allowed = new Set([path.join("src", "lib", "db", "seed.ts")]);
    const offenders: string[] = [];
    const abs = path.join(process.cwd(), "src");
    for (const rel of fs.readdirSync(abs, { recursive: true }) as string[]) {
      if (!/\.(ts|tsx)$/.test(rel) || /\.(test|spec)\.(ts|tsx)$/.test(rel)) continue;
      const file = path.join("src", rel);
      if (allowed.has(file)) continue;
      const text = fs.readFileSync(path.join(abs, rel), "utf8");
      if (/from\s+["'][^"']*content\/load["']/.test(text)) offenders.push(file);
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
