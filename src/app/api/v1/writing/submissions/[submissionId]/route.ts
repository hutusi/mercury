import { isAiEnabled } from "@/lib/ai/client";
import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getWritingSubmissionDetail } from "@/lib/queries/writing";
import { NotFoundError } from "@/lib/services/errors";

export const GET = apiHandler(async (req, ctx: { params: Promise<{ submissionId: string }> }) => {
  const user = await requireUserApi(req);
  const { submissionId } = await ctx.params;

  const data = await getWritingSubmissionDetail(user.id, submissionId);
  if (!data) throw new NotFoundError(`Unknown submission: ${submissionId}`);
  const { submission, prompt } = data;

  const aiScored = submission.status === "ai_scored";
  return Response.json({
    id: submission.id,
    promptId: prompt.id,
    promptTitle: prompt.title,
    createdAt: submission.createdAt,
    text: submission.text,
    wordCount: submission.wordCount,
    status: submission.status,
    feedback: submission.feedback,
    // The degradation contract: self-assessment material only when not AI-scored.
    selfAssess: aiScored ? null : { modelAnswer: prompt.modelAnswer, checklist: prompt.checklist },
    canRetryAi: !aiScored && isAiEnabled(),
  });
});
