"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { ExamSection } from "../../content/types";
import { requireUser } from "../auth/session";
import { db } from "../db";
import { mockExamAttempts, mockExams, type AnswerMap, type SectionDeadline } from "../db/schema";
import { gradeExam } from "../exam-utils";
import { recordActivity } from "../streak";

/** Late submissions within this window are still accepted (network slack). */
const GRACE_MS = 30_000;

function sectionQuestionIds(section: ExamSection): Set<string> {
  return new Set(section.groups.flatMap((g) => g.questions.map((q) => q.id)));
}

export async function startExamAttempt(examId: string): Promise<{ attemptId: string }> {
  const user = await requireUser();

  const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, examId) });
  if (!exam) throw new Error(`Unknown exam: ${examId}`);

  const existing = await db.query.mockExamAttempts.findFirst({
    where: and(
      eq(mockExamAttempts.userId, user.id),
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
      userId: user.id,
      examId,
      track: exam.track,
      sectionDeadlines: deadlines,
      answers: {},
      totalQuestions: exam.totalQuestions,
    })
    .returning({ id: mockExamAttempts.id });

  return { attemptId: attempt.id };
}

const SaveSchema = z.object({
  attemptId: z.string(),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
});

/** Autosave: merge answers for the current, unexpired section only. */
export async function saveExamProgress(input: {
  attemptId: string;
  answers: AnswerMap;
}): Promise<void> {
  const user = await requireUser();
  const { attemptId, answers } = SaveSchema.parse(input);

  const attempt = await db.query.mockExamAttempts.findFirst({
    where: and(eq(mockExamAttempts.id, attemptId), eq(mockExamAttempts.userId, user.id)),
  });
  if (!attempt || attempt.status !== "in_progress") return;

  const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, attempt.examId) });
  if (!exam) return;

  const section = exam.sections[attempt.currentSectionIndex];
  const deadline = attempt.sectionDeadlines.find((d) => d.sectionId === section.id);
  if (!deadline || Date.now() > deadline.expiresAt + GRACE_MS) return;

  const validIds = sectionQuestionIds(section);
  const merged: AnswerMap = { ...attempt.answers };
  for (const [qid, choice] of Object.entries(answers)) {
    if (validIds.has(qid)) merged[qid] = choice;
  }

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

const SubmitSectionSchema = z.object({
  attemptId: z.string(),
  sectionId: z.string(),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
});

export interface SubmitSectionResult {
  done: boolean;
  nextSectionIndex: number;
  deadlines: SectionDeadline[];
}

export async function submitExamSection(input: {
  attemptId: string;
  sectionId: string;
  answers: AnswerMap;
}): Promise<SubmitSectionResult> {
  const user = await requireUser();
  const { attemptId, sectionId, answers } = SubmitSectionSchema.parse(input);

  const attempt = await db.query.mockExamAttempts.findFirst({
    where: and(eq(mockExamAttempts.id, attemptId), eq(mockExamAttempts.userId, user.id)),
  });
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status !== "in_progress") {
    return {
      done: true,
      nextSectionIndex: attempt.currentSectionIndex,
      deadlines: attempt.sectionDeadlines,
    };
  }

  const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, attempt.examId) });
  if (!exam) throw new Error("Exam content missing");

  const section = exam.sections[attempt.currentSectionIndex];
  if (!section || section.id !== sectionId) {
    // Stale client (double submit / refresh race): report current state.
    return {
      done: attempt.status !== "in_progress",
      nextSectionIndex: attempt.currentSectionIndex,
      deadlines: attempt.sectionDeadlines,
    };
  }

  const deadline = attempt.sectionDeadlines.find((d) => d.sectionId === sectionId);
  const onTime = deadline ? Date.now() <= deadline.expiresAt + GRACE_MS : false;

  // Late answers are discarded — only previously autosaved ones count.
  const merged: AnswerMap = { ...attempt.answers };
  if (onTime) {
    const validIds = sectionQuestionIds(section);
    for (const [qid, choice] of Object.entries(answers)) {
      if (validIds.has(qid)) merged[qid] = choice;
    }
  }

  const isLastSection = attempt.currentSectionIndex >= exam.sections.length - 1;

  if (!isLastSection) {
    const next = exam.sections[attempt.currentSectionIndex + 1];
    const now = Date.now();
    const deadlines: SectionDeadline[] = [
      ...attempt.sectionDeadlines,
      { sectionId: next.id, startedAt: now, expiresAt: now + next.durationSeconds * 1000 },
    ];
    await db
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
      );
    return { done: false, nextSectionIndex: attempt.currentSectionIndex + 1, deadlines };
  }

  // Final section: grade everything server-side against unsanitized content.
  const { sectionScores, rawScore, estimate } = gradeExam(exam.track, exam.sections, merged);

  await db
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
    );
  await recordActivity(user.id);

  return {
    done: true,
    nextSectionIndex: attempt.currentSectionIndex,
    deadlines: attempt.sectionDeadlines,
  };
}
