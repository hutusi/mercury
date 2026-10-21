import { FlowBody } from "@/components/flow/FlowBody";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { getFlowContext } from "@/lib/queries/plan";
import { ExamRunner } from "@/components/exam/ExamRunner";
import { requireOnboarded } from "@/lib/settings";
import { getDict } from "@/lib/i18n";
import { localeRedirect } from "@/lib/i18n";
import { sanitizeSections } from "@/lib/exam-utils";
import { getInProgressAttempt } from "@/lib/queries/exams";

export default async function TakeExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const [{ user, timeZone }, { examId }, t] = await Promise.all([
    requireOnboarded(),
    params,
    getDict(),
  ]);

  // Attempts are only created by the startExamAttempt action (intro page
  // button) — a bare GET here never mutates state.
  const [attempt, flow] = await Promise.all([
    getInProgressAttempt(user.id, examId),
    getFlowContext(user.id, timeZone, "mock_exam", examId),
  ]);
  if (!attempt) return localeRedirect(`/exams/${examId}`);

  return (
    <>
      <FlowHeader
        context={flow}
        hubHref={`/exams/${examId}`}
        confirmMessage={t.flow.examContinues}
      />
      <FlowBody width="wide">
        <ExamRunner
          attemptId={attempt.id}
          sections={sanitizeSections(attempt.sectionsSnapshot)}
          initialSectionIndex={attempt.currentSectionIndex}
          initialDeadlines={attempt.sectionDeadlines}
          initialAnswers={attempt.answers}
          // eslint-disable-next-line react-hooks/purity -- the request-time server clock is the point: it anchors the runner's skew correction
          serverNow={Date.now()}
        />
      </FlowBody>
    </>
  );
}
