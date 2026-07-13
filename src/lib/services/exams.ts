import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { mockExamAttempts, mockExams, type AnswerMap, type SectionDeadline } from "../db/schema";
import { acceptSectionAnswers, gradeExam } from "../exam-utils";
import { recordActivityWith } from "../streak";
import { NotFoundError } from "./errors";
import { recordLearnerOutcomeSafely } from "./profile";

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

  await db.transaction(async (tx) => {
    // Lock before merging: two overlapping autosaves must fold into the state
    // left by the previous request, not both write from the same snapshot.
    const [attempt] = await tx
      .select()
      .from(mockExamAttempts)
      .where(and(eq(mockExamAttempts.id, attemptId), eq(mockExamAttempts.userId, userId)))
      .for("update")
      .limit(1);
    if (!attempt || attempt.status !== "in_progress") return;

    const exam = await tx.query.mockExams.findFirst({ where: eq(mockExams.id, attempt.examId) });
    if (!exam) return;

    const section = exam.sections[attempt.currentSectionIndex];
    if (!section) return;
    const deadline = attempt.sectionDeadlines.find((d) => d.sectionId === section.id);
    const merged = acceptSectionAnswers(
      section,
      deadline,
      Date.now(),
      attempt.answers,
      answers,
      GRACE_MS,
    );
    if (merged === attempt.answers) return;

    await tx
      .update(mockExamAttempts)
      .set({ answers: merged })
      .where(eq(mockExamAttempts.id, attempt.id));
  });
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

/** Advance to the next section, or grade the whole exam on the last one. */
export async function submitExamSectionForUser(
  userId: string,
  input: unknown,
): Promise<SubmitSectionResult> {
  const { attemptId, sectionId, answers } = SubmitSectionSchema.parse(input);

  const persisted = await db.transaction(async (tx) => {
    // Section submits share the same row lock as autosave. A retry therefore
    // observes the already-advanced row and returns its persisted state.
    const [attempt] = await tx
      .select()
      .from(mockExamAttempts)
      .where(and(eq(mockExamAttempts.id, attemptId), eq(mockExamAttempts.userId, userId)))
      .for("update")
      .limit(1);
    if (!attempt) throw new NotFoundError("Attempt not found");
    if (attempt.status !== "in_progress") {
      return {
        result: {
          done: true,
          nextSectionIndex: attempt.currentSectionIndex,
          deadlines: attempt.sectionDeadlines,
        },
        sectionScores: null,
      };
    }

    const exam = await tx.query.mockExams.findFirst({ where: eq(mockExams.id, attempt.examId) });
    if (!exam) throw new NotFoundError("Exam content missing");

    const section = exam.sections[attempt.currentSectionIndex];
    if (!section || section.id !== sectionId) {
      return {
        result: {
          done: false,
          nextSectionIndex: attempt.currentSectionIndex,
          deadlines: attempt.sectionDeadlines,
        },
        sectionScores: null,
      };
    }

    const deadline = attempt.sectionDeadlines.find((d) => d.sectionId === sectionId);
    const merged: AnswerMap = acceptSectionAnswers(
      section,
      deadline,
      Date.now(),
      attempt.answers,
      answers,
      GRACE_MS,
    );

    if (attempt.currentSectionIndex < exam.sections.length - 1) {
      const next = exam.sections[attempt.currentSectionIndex + 1];
      const now = Date.now();
      const deadlines: SectionDeadline[] = [
        ...attempt.sectionDeadlines,
        { sectionId: next.id, startedAt: now, expiresAt: now + next.durationSeconds * 1000 },
      ];
      await tx
        .update(mockExamAttempts)
        .set({
          answers: merged,
          currentSectionIndex: attempt.currentSectionIndex + 1,
          sectionDeadlines: deadlines,
        })
        .where(eq(mockExamAttempts.id, attempt.id));
      return {
        result: {
          done: false,
          nextSectionIndex: attempt.currentSectionIndex + 1,
          deadlines,
        },
        sectionScores: null,
      };
    }

    const graded = gradeExam(exam.track, exam.sections, merged);
    await tx
      .update(mockExamAttempts)
      .set({
        answers: merged,
        status: "completed",
        sectionScores: graded.sectionScores,
        rawScore: graded.rawScore,
        estimate: graded.estimate,
        completedAt: new Date(),
      })
      .where(eq(mockExamAttempts.id, attempt.id));
    await recordActivityWith(tx, userId);

    return {
      result: {
        done: true,
        nextSectionIndex: attempt.currentSectionIndex,
        deadlines: attempt.sectionDeadlines,
      },
      sectionScores: graded.sectionScores,
    };
  });

  if (persisted.sectionScores) {
    await recordLearnerOutcomeSafely(userId, {
      signals: persisted.sectionScores.flatMap((score) =>
        score.max === 0
          ? []
          : [
              {
                skill: score.kind,
                value: (score.raw / score.max) * 100,
                source: "exam" as const,
              },
            ],
      ),
    });
  }

  return persisted.result;
}
