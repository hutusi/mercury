import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { listExamsWithAttempts } from "@/lib/queries/exams";

export const GET = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
  const { exams, attempts } = await listExamsWithAttempts(
    user.id,
    track === "business" ? null : track,
  );

  return Response.json({
    // Section metadata only — questions never appear outside a started attempt.
    exams: exams.map((exam) => ({
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
    })),
    attempts: attempts.map((a) => ({
      id: a.id,
      examId: a.examId,
      status: a.status,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      estimate: a.estimate,
    })),
  });
});
