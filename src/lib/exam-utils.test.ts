import { describe, expect, test } from "bun:test";
import { ieltsMiniExam } from "../content/exams/ielts-mini";
import { toeicMiniExam } from "../content/exams/toeic-mini";
import { gradeExam, sanitizeSections } from "./exam-utils";

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
