import { describe, expect, test } from "bun:test";
import { allExams } from "../../../content/load";
import { toAttemptResource } from "./exams";

const exam = allExams.find((e) => e.id === "exam-toeic-mini")!;
const NOW = 1_750_000_000_000;

function attempt(status: "in_progress" | "completed" | "abandoned") {
  return {
    id: "attempt-1",
    examId: exam.id,
    status,
    currentSectionIndex: 0,
    sectionDeadlines: [{ sectionId: exam.sections[0].id, startedAt: NOW, expiresAt: NOW + 60_000 }],
    answers: { q1: 2 },
    sectionScores: null,
    rawScore: status === "completed" ? 20 : null,
    totalQuestions: 25,
    estimate: status === "completed" ? { kind: "toeic", total: 800 } : null,
    startedAt: new Date(NOW),
    completedAt: status === "completed" ? new Date(NOW + 1) : null,
    abandonedAt: status === "abandoned" ? new Date(NOW + 1) : null,
    sectionsSnapshot: exam.sections,
  };
}

describe("toAttemptResource", () => {
  test("in-progress resource never contains answer keys", () => {
    const resource = toAttemptResource(attempt("in_progress"), NOW);
    const json = JSON.stringify(resource);
    expect(json).not.toContain("correctIndex");
    expect(json).not.toContain("explanationZh");
    expect(resource.status).toBe("in_progress");
    if (resource.status === "in_progress") {
      expect(resource.serverTime).toBe(NOW);
      expect(resource.sections.length).toBe(exam.sections.length);
      expect(resource.sectionDeadlines.length).toBe(1);
    }
  });

  test("completed resource carries the full review with keys", () => {
    const resource = toAttemptResource(attempt("completed"), NOW);
    const json = JSON.stringify(resource);
    expect(json).toContain("correctIndex");
    expect(resource.status).toBe("completed");
    if (resource.status === "completed") {
      expect(resource.review.length).toBe(exam.sections.length);
      expect(resource.estimate).toEqual({ kind: "toeic", total: 800 });
    }
  });

  test("abandoned resource reveals neither answers nor review keys", () => {
    const resource = toAttemptResource(attempt("abandoned"), NOW);
    const json = JSON.stringify(resource);
    expect(resource.status).toBe("abandoned");
    expect(json).not.toContain("answers");
    expect(json).not.toContain("correctIndex");
    expect(json).not.toContain("review");
  });
});
