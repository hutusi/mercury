import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { startExamAttemptForUser } from "@/lib/services/exams";

/**
 * Idempotent start: an existing in-progress attempt is returned instead of
 * creating a second one. The server stamps the first section deadline here —
 * clients never set timing.
 */
export const POST = apiHandler(async (req, ctx: { params: Promise<{ examId: string }> }) => {
  const user = await requireUserApi(req);
  const { examId } = await ctx.params;
  return Response.json(await startExamAttemptForUser(user.id, examId));
});
