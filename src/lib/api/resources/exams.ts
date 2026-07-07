import type { ExamSection } from "../../../content/types";
import { sanitizeSections } from "../../exam-utils";

/**
 * Pure mapper from an attempt row + exam content to the API resource.
 * Status decides what may cross the wire: an in-progress attempt only ever
 * carries sanitizeSections() output (no correctIndex/explanationZh); the full
 * sections with keys appear as `review` strictly after completion. Pure so a
 * DB-free unit test can serialize the result and prove nothing leaks.
 */

interface AttemptLike {
  id: string;
  examId: string;
  status: "in_progress" | "completed" | "expired";
  currentSectionIndex: number;
  sectionDeadlines: { sectionId: string; startedAt: number; expiresAt: number }[];
  answers: Record<string, number>;
  sectionScores: unknown;
  rawScore: number | null;
  totalQuestions: number;
  estimate: unknown;
  startedAt: Date;
  completedAt: Date | null;
}

export function toAttemptResource(
  attempt: AttemptLike,
  exam: { sections: ExamSection[] },
  now: number,
) {
  if (attempt.status === "in_progress") {
    return {
      id: attempt.id,
      examId: attempt.examId,
      status: "in_progress" as const,
      // Deadlines are absolute epoch-ms; serverTime lets clients correct skew.
      serverTime: now,
      currentSectionIndex: attempt.currentSectionIndex,
      sectionDeadlines: attempt.sectionDeadlines,
      answers: attempt.answers,
      sections: sanitizeSections(exam.sections),
    };
  }

  return {
    id: attempt.id,
    examId: attempt.examId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    sectionScores: attempt.sectionScores,
    rawScore: attempt.rawScore,
    totalQuestions: attempt.totalQuestions,
    estimate: attempt.estimate,
    answers: attempt.answers,
    // Post-completion review legitimately includes the answer key.
    review: exam.sections,
  };
}
