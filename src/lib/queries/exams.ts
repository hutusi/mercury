import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Track } from "../../content/types";
import { db } from "../db";
import { mockExamAttempts, mockExams } from "../db/schema";

/**
 * Exams visible to a track plus the user's attempt history. Exam-track users
 * see their own exam; business users see both — the mini-TOEIC is the reverse
 * funnel's benchmark hook.
 */
export async function listExamsWithAttempts(userId: string, track: Track) {
  const [exams, attempts] = await Promise.all([
    db.query.mockExams.findMany({
      where:
        track === "business"
          ? inArray(mockExams.track, ["toeic", "ielts"])
          : eq(mockExams.track, track),
      // Deterministic listing now that a track has more than one exam; the
      // id slugs happen to sort mini before standard within a track.
      orderBy: asc(mockExams.id),
    }),
    db.query.mockExamAttempts.findMany({
      where: eq(mockExamAttempts.userId, userId),
      orderBy: desc(mockExamAttempts.startedAt),
      limit: 20,
    }),
  ]);

  return { exams, attempts };
}

/** Raw exam row — sections carry answer keys; NEVER ship them to a client raw. */
export async function getExamById(examId: string) {
  return db.query.mockExams.findFirst({ where: eq(mockExams.id, examId) });
}

/** Exam intro data: the exam plus the user's resumable attempt, if any. */
export async function getExamIntro(userId: string, examId: string) {
  const [exam, inProgress] = await Promise.all([
    getExamById(examId),
    getInProgressAttempt(userId, examId),
  ]);
  if (!exam) return null;
  return { exam, inProgress };
}

export async function getInProgressAttempt(userId: string, examId: string) {
  return db.query.mockExamAttempts.findFirst({
    where: and(
      eq(mockExamAttempts.userId, userId),
      eq(mockExamAttempts.examId, examId),
      eq(mockExamAttempts.status, "in_progress"),
    ),
  });
}

/** A user's attempt with live metadata and its immutable section snapshot. */
export async function getAttemptWithExam(userId: string, attemptId: string) {
  const attempt = await db.query.mockExamAttempts.findFirst({
    where: and(eq(mockExamAttempts.id, attemptId), eq(mockExamAttempts.userId, userId)),
  });
  if (!attempt) return null;

  const exam = await getExamById(attempt.examId);
  if (!exam) return null;

  return { attempt, exam: { ...exam, sections: attempt.sectionsSnapshot } };
}
