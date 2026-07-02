import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ExamRunner } from "@/components/exam/ExamRunner";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { mockExamAttempts, mockExams } from "@/lib/db/schema";
import { sanitizeSections } from "@/lib/exam-utils";

export default async function TakeExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const user = await requireUser();
  const { examId } = await params;

  // Attempts are only created by the startExamAttempt action (intro page
  // button) — a bare GET here never mutates state.
  const attempt = await db.query.mockExamAttempts.findFirst({
    where: and(
      eq(mockExamAttempts.userId, user.id),
      eq(mockExamAttempts.examId, examId),
      eq(mockExamAttempts.status, "in_progress"),
    ),
  });
  if (!attempt) redirect(`/exams/${examId}`);

  const exam = await db.query.mockExams.findFirst({ where: eq(mockExams.id, examId) });
  if (!exam) redirect("/exams");

  return (
    <ExamRunner
      attemptId={attempt.id}
      sections={sanitizeSections(exam.sections)}
      initialSectionIndex={attempt.currentSectionIndex}
      initialDeadlines={attempt.sectionDeadlines}
      initialAnswers={attempt.answers}
    />
  );
}
