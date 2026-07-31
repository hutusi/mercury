import { describe, expect, test } from "bun:test";
import type { BookSection, McqQuestion } from "../content/types";
import {
  currentChapterId,
  deriveChapterStates,
  estimateChapterMinutes,
  findCheckIn,
  gradeBookQuiz,
  groupBooksByBand,
  recommendedBands,
  sanitizeChapter,
} from "./book-core";

const question = (id: string, correctIndex = 1): McqQuestion => ({
  id,
  stem: `stem ${id}`,
  options: ["a", "b", "c", "d"],
  correctIndex,
  explanationZh: `解析 ${id}`,
});

const sections: BookSection[] = [
  { id: "s1", text: "First section.", checkIn: question("c1", 0) },
  { id: "s2", text: "Second section." },
  { id: "s3", text: "Third section.", checkIn: question("c2", 3) },
];

describe("sanitizeChapter", () => {
  test("strips correctIndex and explanationZh from check-ins and quiz", () => {
    const { sections: safe, quiz } = sanitizeChapter({
      sections,
      quiz: [question("q1"), question("q2")],
    });

    for (const item of [...quiz, ...safe.flatMap((s) => (s.checkIn ? [s.checkIn] : []))]) {
      expect(item).not.toHaveProperty("correctIndex");
      expect(item).not.toHaveProperty("explanationZh");
      expect(item.options).toHaveLength(4);
    }
    expect(safe[1].checkIn).toBeUndefined();
    expect(safe.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });
});

describe("findCheckIn", () => {
  test("finds a check-in by id", () => {
    expect(findCheckIn(sections, "c2")?.id).toBe("c2");
  });

  test("never resolves quiz question ids (answer-oracle guard)", () => {
    // The reveal endpoint uses this lookup; if it also matched quiz ids it
    // would leak end-of-chapter answers before submission.
    expect(findCheckIn(sections, "q1")).toBeNull();
    expect(findCheckIn(sections, "s1")).toBeNull();
  });
});

describe("gradeBookQuiz", () => {
  const quiz = [question("q1", 0), question("q2", 1), question("q3", 2)];

  test("scores answers against the key", () => {
    const graded = gradeBookQuiz(quiz, { q1: 0, q2: 1, q3: 0 });
    expect(graded.score).toBe(2);
    expect(graded.total).toBe(3);
    expect(graded.perQuestion.map((p) => p.correct)).toEqual([true, true, false]);
  });

  test("missing answers count as wrong", () => {
    const graded = gradeBookQuiz(quiz, { q2: 1 });
    expect(graded.score).toBe(1);
    expect(graded.total).toBe(3);
  });
});

describe("deriveChapterStates", () => {
  const chapters = [
    { id: "ch3", sortOrder: 3 },
    { id: "ch1", sortOrder: 1 },
    { id: "ch2", sortOrder: 2 },
  ];

  test("chapter 1 is always unlocked; the rest lock behind the previous", () => {
    const states = deriveChapterStates(chapters, new Set());
    expect(states.map((s) => s.chapterId)).toEqual(["ch1", "ch2", "ch3"]);
    expect(states.map((s) => s.locked)).toEqual([false, true, true]);
  });

  test("completing a chapter unlocks exactly the next one", () => {
    const states = deriveChapterStates(chapters, new Set(["ch1"]));
    expect(states.map((s) => s.locked)).toEqual([false, false, true]);
    expect(states.map((s) => s.completed)).toEqual([true, false, false]);
  });

  test("a fully completed book has no locked chapters", () => {
    const states = deriveChapterStates(chapters, new Set(["ch1", "ch2", "ch3"]));
    expect(states.every((s) => !s.locked && s.completed)).toBe(true);
  });

  test("currentChapterId is the first unlocked incomplete chapter", () => {
    expect(currentChapterId(deriveChapterStates(chapters, new Set()))).toBe("ch1");
    expect(currentChapterId(deriveChapterStates(chapters, new Set(["ch1"])))).toBe("ch2");
    expect(currentChapterId(deriveChapterStates(chapters, new Set(["ch1", "ch2", "ch3"])))).toBe(
      null,
    );
  });
});

describe("estimateChapterMinutes", () => {
  test("scales with words and quiz size, clamped to 5..30", () => {
    expect(estimateChapterMinutes(1100, 5)).toBe(10);
    expect(estimateChapterMinutes(74, 3)).toBe(5);
    expect(estimateChapterMinutes(10000, 10)).toBe(30);
  });
});

describe("recommendedBands", () => {
  test("maps every self-rated level to its starting band(s)", () => {
    expect(recommendedBands("novice")).toEqual(["B1"]);
    expect(recommendedBands("elementary")).toEqual(["B1"]);
    expect(recommendedBands("intermediate")).toEqual(["B1", "B2"]);
    expect(recommendedBands("upper")).toEqual(["B2"]);
    expect(recommendedBands("advanced")).toEqual(["C1"]);
  });

  test("unrated learners get no recommendation", () => {
    expect(recommendedBands(null)).toEqual([]);
  });
});

describe("groupBooksByBand", () => {
  test("groups by band in first-occurrence (ladder) order", () => {
    const groups = groupBooksByBand([
      { id: "b1", cefrLevel: "B1" as const },
      { id: "b2", cefrLevel: "B2" as const },
      { id: "b3", cefrLevel: "C1" as const },
    ]);
    expect(groups.map((g) => g.band)).toEqual(["B1", "B2", "C1"]);
    expect(groups[0].books.map((b) => b.id)).toEqual(["b1"]);
  });

  test("folds non-adjacent same-band books into the first occurrence", () => {
    const groups = groupBooksByBand([
      { id: "b1", cefrLevel: "B1" as const },
      { id: "b2", cefrLevel: "B2" as const },
      { id: "b3", cefrLevel: "B1" as const },
    ]);
    expect(groups.map((g) => g.band)).toEqual(["B1", "B2"]);
    expect(groups[0].books.map((b) => b.id)).toEqual(["b1", "b3"]);
  });

  test("empty library yields no groups", () => {
    expect(groupBooksByBand([])).toEqual([]);
  });
});
