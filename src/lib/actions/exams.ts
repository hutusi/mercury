"use server";

import { requireUser } from "../auth/session";
import type { AnswerMap } from "../db/schema";
import {
  abandonExamAttemptForUser,
  saveExamProgressForUser,
  startExamAttemptForUser,
  submitExamSectionForUser,
  type SubmitSectionResult,
} from "../services/exams";

export type { SubmitSectionResult } from "../services/exams";

export async function startExamAttempt(examId: string): Promise<{ attemptId: string }> {
  const user = await requireUser();
  return startExamAttemptForUser(user.id, examId);
}

export async function abandonExamAttempt(attemptId: string): Promise<{ status: "abandoned" }> {
  const user = await requireUser();
  return abandonExamAttemptForUser(user.id, attemptId);
}

/** Autosave: merge answers for the current, unexpired section only. */
export async function saveExamProgress(input: {
  attemptId: string;
  answers: AnswerMap;
}): Promise<void> {
  const user = await requireUser();
  return saveExamProgressForUser(user.id, input);
}

export async function submitExamSection(input: {
  attemptId: string;
  sectionId: string;
  answers: AnswerMap;
}): Promise<SubmitSectionResult> {
  const user = await requireUser();
  return submitExamSectionForUser(user.id, input);
}
