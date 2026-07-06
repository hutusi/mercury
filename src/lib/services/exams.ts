import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { mockExamAttempts, mockExams, type AnswerMap, type SectionDeadline } from "../db/schema";
import { acceptSectionAnswers, gradeExam } from "../exam-utils";
import { recordActivity } from "../streak";
import { NotFoundError } from "./errors";

/** Late submissions within this window are still accepted (network slack). */
export const GRACE_MS = 30_000;

/** Create (or resume) an in-progress attempt and stamp the first section deadline. */
export async function startExamAttemptForUser(
  userId: string,
  examId: string,
): Promise<{ attemptId: string }> {
  const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, examId) });
  if (!exam) throw new NotFoundError(`Unknown exam: ${examId}`);

  const existing = await db.query.mockExamAttempts.findFirst({
    where: and(
      eq(mockExamAttempts.userId, userId),
      eq(mockExamAttempts.examId, examId),
      eq(mockExamAttempts.status, "in_progress"),
    ),
  });
  if (existing) return { attemptId: existing.id };

  const firstSection = exam.sections[0];
  const now = Date.now();
  const deadlines: SectionDeadline[] = [
    {
      sectionId: firstSection.id,
      startedAt: now,
      expiresAt: now + firstSection.durationSeconds * 1000,
    },
  ];

  const [attempt] = await db
    .insert(mockExamAttempts)
    .values({
      userId,
      examId,
      track: exam.track,
      sectionDeadlines: deadlines,
      answers: {},
      totalQuestions: exam.totalQuestions,
    })
    // The partial unique index (userId, examId where in_progress) closes the
    // check-then-insert race: a concurrent start loses the insert here...
    .onConflictDoNothing()
    .returning({ id: mockExamAttempts.id });
  if (attempt) return { attemptId: attempt.id };

  // ...and resumes the attempt the winner created.
  const winner = await db.query.mockExamAttempts.findFirst({
    where: and(
      eq(mockExamAttempts.userId, userId),
      eq(mockExamAttempts.examId, examId),
      eq(mockExamAttempts.status, "in_progress"),
    ),
  });
  if (!winner) throw new NotFoundError(`Unknown exam: ${examId}`);
  return { attemptId: winner.id };
}

export const SaveExamProgressSchema = z.object({
  attemptId: z.string(),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
});

/** Autosave: merge answers for the current, unexpired section only. */
export async function saveExamProgressForUser(userId: string, input: unknown): Promise<void> {
  const { attemptId, answers } = SaveExamProgressSchema.parse(input);

  const attempt = await db.query.mockExamAttempts.findFirst({
    where: and(eq(mockExamAttempts.id, attemptId), eq(mockExamAttempts.userId, userId)),
  });
  if (!attempt || attempt.status !== "in_progress") return;

  const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, attempt.examId) });
  if (!exam) return;

  const section = exam.sections[attempt.currentSectionIndex];
  const deadline = attempt.sectionDeadlines.find((d) => d.sectionId === section.id);
  const merged = acceptSectionAnswers(
    section,
    deadline,
    Date.now(),
    attempt.answers,
    answers,
    GRACE_MS,
  );
  if (merged === attempt.answers) return; // late or no deadline — nothing accepted

  // Guard on status + section so a delayed autosave can't overwrite an
  // attempt that another request has already advanced or completed.
  await db
    .update(mockExamAttempts)
    .set({ answers: merged })
    .where(
      and(
        eq(mockExamAttempts.id, attempt.id),
        eq(mockExamAttempts.status, "in_progress"),
        eq(mockExamAttempts.currentSectionIndex, attempt.currentSectionIndex),
      ),
    );
}

export const SubmitSectionSchema = z.object({
  attemptId: z.string(),
  sectionId: z.string(),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
});

export interface SubmitSectionResult {
  done: boolean;
  nextSectionIndex: number;
  deadlines: SectionDeadline[];
}

/**
 * Fallback when a guarded update matched no row: a concurrent request
 * (e.g. a network-retry double submit) advanced or completed the attempt
 * first. Report the state that actually persisted instead of pretending
 * this request's write happened.
 */
async function persistedSectionState(
  userId: string,
  attemptId: string,
): Promise<SubmitSectionResult> {
  const fresh = await db.query.mockExamAttempts.findFirst({
    where: and(eq(mockExamAttempts.id, attemptId), eq(mockExamAttempts.userId, userId)),
  });
  if (!fresh) throw new NotFoundError("Attempt not found");
  return {
    done: fresh.status !== "in_progress",
    nextSectionIndex: fresh.currentSectionIndex,
    deadlines: fresh.sectionDeadlines,
  };
}

/** Advance to the next section, or grade the whole exam on the last one. */
export async function submitExamSectionForUser(
  userId: string,
  input: unknown,
): Promise<SubmitSectionResult> {
  const { attemptId, sectionId, answers } = SubmitSectionSchema.parse(input);

  const attempt = await db.query.mockExamAttempts.findFirst({
    where: and(eq(mockExamAttempts.id, attemptId), eq(mockExamAttempts.userId, userId)),
  });
  if (!attempt) throw new NotFoundError("Attempt not found");
  if (attempt.status !== "in_progress") {
    return {
      done: true,
      nextSectionIndex: attempt.currentSectionIndex,
      deadlines: attempt.sectionDeadlines,
    };
  }

  const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, attempt.examId) });
  if (!exam) throw new NotFoundError("Exam content missing");

  const section = exam.sections[attempt.currentSectionIndex];
  if (!section || section.id !== sectionId) {
    // Stale client (double submit / refresh race): report current state.
    return {
      done: attempt.status !== "in_progress",
      nextSectionIndex: attempt.currentSectionIndex,
      deadlines: attempt.sectionDeadlines,
    };
  }

  // Late answers are discarded — only previously autosaved ones count.
  const deadline = attempt.sectionDeadlines.find((d) => d.sectionId === sectionId);
  const merged: AnswerMap = acceptSectionAnswers(
    section,
    deadline,
    Date.now(),
    attempt.answers,
    answers,
    GRACE_MS,
  );

  const isLastSection = attempt.currentSectionIndex >= exam.sections.length - 1;

  if (!isLastSection) {
    const next = exam.sections[attempt.currentSectionIndex + 1];
    const now = Date.now();
    const deadlines: SectionDeadline[] = [
      ...attempt.sectionDeadlines,
      { sectionId: next.id, startedAt: now, expiresAt: now + next.durationSeconds * 1000 },
    ];
    const [advanced] = await db
      .update(mockExamAttempts)
      .set({
        answers: merged,
        currentSectionIndex: attempt.currentSectionIndex + 1,
        sectionDeadlines: deadlines,
      })
      .where(
        and(
          eq(mockExamAttempts.id, attempt.id),
          eq(mockExamAttempts.status, "in_progress"),
          eq(mockExamAttempts.currentSectionIndex, attempt.currentSectionIndex),
        ),
      )
      .returning({ id: mockExamAttempts.id });
    if (!advanced) return persistedSectionState(userId, attempt.id);
    return { done: false, nextSectionIndex: attempt.currentSectionIndex + 1, deadlines };
  }

  // Final section: grade everything server-side against unsanitized content.
  const { sectionScores, rawScore, estimate } = gradeExam(exam.track, exam.sections, merged);

  const [completed] = await db
    .update(mockExamAttempts)
    .set({
      answers: merged,
      status: "completed",
      sectionScores,
      rawScore,
      estimate,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(mockExamAttempts.id, attempt.id),
        eq(mockExamAttempts.status, "in_progress"),
        eq(mockExamAttempts.currentSectionIndex, attempt.currentSectionIndex),
      ),
    )
    .returning({ id: mockExamAttempts.id });
  if (!completed) return persistedSectionState(userId, attempt.id);
  await recordActivity(userId);

  return {
    done: true,
    nextSectionIndex: attempt.currentSectionIndex,
    deadlines: attempt.sectionDeadlines,
  };
}
