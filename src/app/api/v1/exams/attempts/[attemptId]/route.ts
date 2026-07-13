import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { toAttemptResource } from "@/lib/api/resources/exams";
import { getAttemptWithExam } from "@/lib/queries/exams";
import { NotFoundError } from "@/lib/services/errors";

export const GET = apiHandler(async (req, ctx: { params: Promise<{ attemptId: string }> }) => {
  const user = await requireUserApi(req);
  const { attemptId } = await ctx.params;

  const data = await getAttemptWithExam(user.id, attemptId);
  if (!data) throw new NotFoundError(`Unknown attempt: ${attemptId}`);

  return Response.json(toAttemptResource(data.attempt, Date.now()));
});
