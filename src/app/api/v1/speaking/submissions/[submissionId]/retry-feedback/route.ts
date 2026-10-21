import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { retrySpeakingFeedbackForUser } from "@/lib/services/speaking";

// Makes a runtime AI call (directly or via server actions): the provider
// budget plus claim/publish headroom, inside the lease stale window
// (src/lib/ai/budget.ts).
export const maxDuration = 115;

/** 503 (ai_unavailable) when grading fails again; CAS keeps retries safe. */
export const POST = apiHandler(async (req, ctx: { params: Promise<{ submissionId: string }> }) => {
  const user = await requireUserApi(req);
  const { submissionId } = await ctx.params;
  return Response.json(
    await retrySpeakingFeedbackForUser(user.id, submissionId, await readJson(req)),
  );
});
