import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getWritingPromptWithHistory } from "@/lib/queries/writing";
import { NotFoundError } from "@/lib/services/errors";

export const GET = apiHandler(async (req, ctx: { params: Promise<{ promptId: string }> }) => {
  const user = await requireUserApi(req);
  const { promptId } = await ctx.params;

  const data = await getWritingPromptWithHistory(user.id, promptId);
  if (!data) throw new NotFoundError(`Unknown writing prompt: ${promptId}`);
  const { prompt, past } = data;

  return Response.json({
    // Web parity: modelAnswer/checklist stay server-side until a submission
    // lands in self-assessment mode — never on the prompt itself.
    prompt: {
      id: prompt.id,
      taskType: prompt.taskType,
      title: prompt.title,
      titleZh: prompt.titleZh,
      promptEn: prompt.promptEn,
      promptZh: prompt.promptZh,
      minWords: prompt.minWords,
      suggestedMinutes: prompt.suggestedMinutes,
    },
    pastSubmissions: past.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      wordCount: s.wordCount,
      status: s.status,
      scoreLabel: s.feedback?.scoreLabel ?? null,
    })),
  });
});
