import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getExamIntro } from "@/lib/queries/exams";
import { NotFoundError } from "@/lib/services/errors";

export const GET = apiHandler(async (req, ctx: { params: Promise<{ examId: string }> }) => {
  const user = await requireUserApi(req);
  const { examId } = await ctx.params;

  const data = await getExamIntro(user.id, examId);
  if (!data) throw new NotFoundError(`Unknown exam: ${examId}`);
  const { exam, inProgress } = data;

  return Response.json({
    id: exam.id,
    track: exam.track,
    title: exam.title,
    titleZh: exam.titleZh,
    descriptionZh: exam.descriptionZh,
    totalQuestions: exam.totalQuestions,
    sections: exam.sections.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      titleZh: s.titleZh,
      durationSeconds: s.durationSeconds,
      questionCount: s.groups.reduce((n, g) => n + g.questions.length, 0),
    })),
    inProgressAttemptId: inProgress?.id ?? null,
  });
});
