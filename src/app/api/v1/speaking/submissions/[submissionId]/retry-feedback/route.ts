import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { retrySpeakingFeedbackForUser } from "@/lib/services/speaking";

/** 503 (ai_unavailable) when grading fails again; CAS keeps retries safe. */
export const POST = apiHandler(async (req, ctx: { params: Promise<{ submissionId: string }> }) => {
  const user = await requireUserApi(req);
  const { submissionId } = await ctx.params;
  return Response.json(await retrySpeakingFeedbackForUser(user.id, submissionId));
});
