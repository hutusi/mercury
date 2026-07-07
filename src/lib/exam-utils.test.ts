import { describe, expect, test } from "bun:test";
import { allExams } from "../content/load";
import { acceptSectionAnswers, gradeExam, sanitizeSections } from "./exam-utils";

const toeicMiniExam = allExams.find((e) => e.id === "exam-toeic-mini")!;
const ieltsMiniExam = allExams.find((e) => e.id === "exam-ielts-mini")!;

function perfectAnswers(exam: typeof toeicMiniExam): Record<string, number> {
  const answers: Record<string, number> = {};
  for (const section of exam.sections) {
    for (const group of section.groups) {
      for (const q of group.questions) answers[q.id] = q.correctIndex;
    }
  }
  return answers;
}

describe("sanitizeSections", () => {
  test("strips answers and explanations but keeps scripts for TTS", () => {
    const sanitized = sanitizeSections(toeicMiniExam.sections);
    const json = JSON.stringify(sanitized);
    expect(json).not.toContain("correctIndex");
    expect(json).not.toContain("explanationZh");
    expect(sanitized[0].groups[0].script?.length).toBeGreaterThan(0);
    const total = sanitized.flatMap((s) => s.groups.flatMap((g) => g.questions)).length;
    expect(total).toBe(25);
  });
});

describe("gradeExam", () => {
  test("perfect mini-TOEIC maps to 990", () => {
    const { rawScore, maxScore, estimate } = gradeExam(
      "toeic",
      toeicMiniExam.sections,
      perfectAnswers(toeicMiniExam),
    );
    expect(rawScore).toBe(25);
    expect(maxScore).toBe(25);
    expect(estimate).toEqual({ kind: "toeic", listening: 495, reading: 495, total: 990 });
  });

  test("empty answers score zero with the 10-point TOEIC floor", () => {
    const { rawScore, estimate } = gradeExam("toeic", toeicMiniExam.sections, {});
    expect(rawScore).toBe(0);
    expect(estimate).toEqual({ kind: "toeic", listening: 5, reading: 5, total: 10 });
  });

  test("perfect mini-IELTS is band 9", () => {
    const { estimate } = gradeExam("ielts", ieltsMiniExam.sections, perfectAnswers(ieltsMiniExam));
    expect(estimate).toEqual({ kind: "ielts", band: 9 });
  });

  test("partial IELTS maps through the band table", () => {
    const answers = perfectAnswers(ieltsMiniExam);
    // Remove 9 correct answers: 14/23 ≈ 61% → band 6.5.
    for (const id of Object.keys(answers).slice(0, 9)) delete answers[id];
    const { rawScore, estimate } = gradeExam("ielts", ieltsMiniExam.sections, answers);
    expect(rawScore).toBe(14);
    expect(estimate).toEqual({ kind: "ielts", band: 6.5 });
  });

  test("wrong answers do not score even when every question is answered", () => {
    const answers = perfectAnswers(toeicMiniExam);
    const wrong: Record<string, number> = {};
    for (const [id, correct] of Object.entries(answers)) wrong[id] = (correct + 1) % 4;
    const { rawScore } = gradeExam("toeic", toeicMiniExam.sections, wrong);
    expect(rawScore).toBe(0);
  });
});

describe("acceptSectionAnswers", () => {
  const GRACE_MS = 30_000;
  const section = toeicMiniExam.sections[0];
  const otherSection = toeicMiniExam.sections[1];
  const qid = section.groups[0].questions[0].id;
  const foreignQid = otherSection.groups[0].questions[0].id;
  const now = 1_000_000;
  const deadline = { expiresAt: now + 60_000 };

  test("accepts and merges answers within the deadline", () => {
    const existing = { [qid]: 0 };
    const merged = acceptSectionAnswers(section, deadline, now, existing, { [qid]: 2 }, GRACE_MS);
    expect(merged[qid]).toBe(2);
    expect(merged).not.toBe(existing); // fresh object on accept
  });

  test("accepts answers within the grace window past the deadline", () => {
    const merged = acceptSectionAnswers(
      section,
      { expiresAt: now - 10_000 },
      now,
      {},
      { [qid]: 1 },
      GRACE_MS,
    );
    expect(merged[qid]).toBe(1);
  });

  test("discards late answers, returning existing unchanged", () => {
    const existing = { [qid]: 3 };
    const merged = acceptSectionAnswers(
      section,
      { expiresAt: now - GRACE_MS - 1 },
      now,
      existing,
      { [qid]: 0 },
      GRACE_MS,
    );
    expect(merged).toBe(existing); // same reference — caller can skip the write
    expect(merged[qid]).toBe(3);
  });

  test("discards everything when the section has no deadline", () => {
    const existing = {};
    expect(acceptSectionAnswers(section, undefined, now, existing, { [qid]: 1 }, GRACE_MS)).toBe(
      existing,
    );
  });

  test("filters out answers for questions outside the section", () => {
    const merged = acceptSectionAnswers(
      section,
      deadline,
      now,
      {},
      { [qid]: 1, [foreignQid]: 2, "bogus-question": 3 },
      GRACE_MS,
    );
    expect(merged).toEqual({ [qid]: 1 });
  });
});
