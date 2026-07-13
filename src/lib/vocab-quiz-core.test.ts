import { describe, expect, test } from "bun:test";
import {
  buildQuizQuestion,
  gradeQuizAnswer,
  sanitizeQuizQuestion,
  shuffle,
  type QuizWordInput,
} from "./vocab-quiz-core";

function words(n: number): QuizWordInput[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`,
    headword: `head${i}`,
    translationZh: `译${i}`,
  }));
}

/** Deterministic rng cycling a fixed sequence. */
function seededRng(): () => number {
  let i = 0;
  const seq = [0.11, 0.42, 0.73, 0.29, 0.87, 0.05, 0.61, 0.34];
  return () => seq[i++ % seq.length];
}

describe("buildQuizQuestion", () => {
  test("works with default randomness (no rng argument)", () => {
    // The quiz page calls without an rng — cover the Math.random default.
    const pool = words(10);
    const q = buildQuizQuestion(pool[0], pool, "en2zh");
    expect(q.options).toHaveLength(4);
    expect(q.options.filter((o) => o.wordId === "w0")).toHaveLength(1);
    expect(new Set(q.options.map((o) => o.wordId)).size).toBe(4);
  });

  test("produces 4 options with exactly one correct", () => {
    const pool = words(10);
    const q = buildQuizQuestion(pool[0], pool, "en2zh", seededRng());
    expect(q.options).toHaveLength(4);
    expect(q.options.filter((o) => o.wordId === "w0")).toHaveLength(1);
    expect(new Set(q.options.map((o) => o.wordId)).size).toBe(4);
  });

  test("en2zh prompts with the headword and offers translations", () => {
    const pool = words(5);
    const q = buildQuizQuestion(pool[1], pool, "en2zh", seededRng());
    expect(q.prompt).toBe("head1");
    expect(q.options.find((o) => o.wordId === "w1")?.text).toBe("译1");
  });

  test("zh2en prompts with the translation and offers headwords", () => {
    const pool = words(5);
    const q = buildQuizQuestion(pool[2], pool, "zh2en", seededRng());
    expect(q.prompt).toBe("译2");
    expect(q.options.find((o) => o.wordId === "w2")?.text).toBe("head2");
  });

  test("excludes the word itself from distractors even when in the pool", () => {
    const pool = words(4);
    const q = buildQuizQuestion(pool[0], pool, "en2zh", seededRng());
    expect(q.options.filter((o) => o.wordId === "w0")).toHaveLength(1);
  });

  test("deduplicates distractors by the visible label for each direction", () => {
    const pool: QuizWordInput[] = [
      { id: "answer", headword: "invoice", translationZh: "发票" },
      { id: "duplicate-answer", headword: "bill", translationZh: "发票" },
      { id: "duplicate-a", headword: "memo", translationZh: "备忘录" },
      { id: "duplicate-b", headword: "note", translationZh: "备忘录" },
      { id: "unique-a", headword: "agenda", translationZh: "议程" },
      { id: "unique-b", headword: "courier", translationZh: "快递员" },
    ];

    const en2zh = buildQuizQuestion(pool[0], pool, "en2zh", seededRng());
    expect(en2zh.options).toHaveLength(4);
    expect(new Set(en2zh.options.map((option) => option.text)).size).toBe(4);
    expect(en2zh.options.filter((option) => option.text === "发票")).toHaveLength(1);

    const zh2en = buildQuizQuestion(pool[0], pool, "zh2en", seededRng());
    expect(new Set(zh2en.options.map((option) => option.text)).size).toBe(zh2en.options.length);
  });

  test("returns only the available unique choices when the pool is small", () => {
    const pool: QuizWordInput[] = [
      { id: "answer", headword: "invoice", translationZh: "发票" },
      { id: "duplicate-answer", headword: "bill", translationZh: "发票" },
      { id: "same-a", headword: "memo", translationZh: "备忘录" },
      { id: "same-b", headword: "note", translationZh: "备忘录" },
    ];

    const question = buildQuizQuestion(pool[0], pool, "en2zh", seededRng());
    expect(question.options).toHaveLength(2);
    expect(new Set(question.options.map((option) => option.text))).toEqual(
      new Set(["发票", "备忘录"]),
    );
  });

  test("public serialization removes every word id and still supports opaque grading", () => {
    const pool = words(5);
    let id = 0;
    const stored = buildQuizQuestion(pool[0], pool, "en2zh", seededRng(), () => `opaque-${id++}`);
    const publicQuestion = sanitizeQuizQuestion(stored);

    expect(JSON.stringify(publicQuestion)).not.toContain("wordId");
    expect(publicQuestion.id).toStartWith("opaque-");
    expect(publicQuestion.options.every((option) => option.id.startsWith("opaque-"))).toBe(true);

    const correct = stored.options.find((option) => option.wordId === stored.wordId)!;
    expect(gradeQuizAnswer(stored, correct.id)).toEqual({
      correct: true,
      correctOptionId: correct.id,
    });
    expect(gradeQuizAnswer(stored, "not-an-option")).toBeNull();
  });
});

describe("shuffle", () => {
  test("returns a permutation without mutating the input", () => {
    const input = words(6);
    const copy = [...input];
    const out = shuffle(input, seededRng());
    expect(input).toEqual(copy);
    expect([...out].sort((a, b) => a.id.localeCompare(b.id))).toEqual(input);
  });
});
