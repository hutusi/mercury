import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { abandonExamAttemptForUser } from "@/lib/services/exams";

export const POST = apiHandler(async (req, ctx: { params: Promise<{ attemptId: string }> }) => {
  const user = await requireUserApi(req);
  const { attemptId } = await ctx.params;
  return Response.json(await abandonExamAttemptForUser(user.id, attemptId));
});
