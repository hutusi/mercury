import { ExamRunner } from "@/components/exam/ExamRunner";
import { requireUser } from "@/lib/auth/session";
import { localeRedirect } from "@/lib/i18n";
import { sanitizeSections } from "@/lib/exam-utils";
import { getInProgressAttempt } from "@/lib/queries/exams";

export default async function TakeExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const user = await requireUser();
  const { examId } = await params;

  // Attempts are only created by the startExamAttempt action (intro page
  // button) — a bare GET here never mutates state.
  const attempt = await getInProgressAttempt(user.id, examId);
  if (!attempt) return localeRedirect(`/exams/${examId}`);

  return (
    <ExamRunner
      attemptId={attempt.id}
      sections={sanitizeSections(attempt.sectionsSnapshot)}
      initialSectionIndex={attempt.currentSectionIndex}
      initialDeadlines={attempt.sectionDeadlines}
      initialAnswers={attempt.answers}
    />
  );
}
