import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getSpeakingPromptWithHistory } from "@/lib/queries/speaking";
import { NotFoundError } from "@/lib/services/errors";

export const GET = apiHandler(async (req, ctx: { params: Promise<{ promptId: string }> }) => {
  const user = await requireUserApi(req);
  const { promptId } = await ctx.params;

  const data = await getSpeakingPromptWithHistory(user.id, promptId);
  if (!data) throw new NotFoundError(`Unknown speaking prompt: ${promptId}`);
  const { prompt, past } = data;

  return Response.json({
    // Web parity: unlike writing, the speaking runner shows the model answer
    // and checklist up front — speaking is practice, not a graded secret.
    prompt: {
      id: prompt.id,
      partType: prompt.partType,
      title: prompt.title,
      titleZh: prompt.titleZh,
      promptEn: prompt.promptEn,
      promptZh: prompt.promptZh,
      prepSeconds: prompt.prepSeconds,
      speakSeconds: prompt.speakSeconds,
      modelAnswer: prompt.modelAnswer,
      checklist: prompt.checklist,
    },
    pastSubmissions: past.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      durationSeconds: s.durationSeconds,
      status: s.status,
      scoreLabel: s.feedback?.scoreLabel ?? null,
    })),
  });
});
