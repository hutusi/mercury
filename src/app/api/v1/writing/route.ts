import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { listWritingPrompts } from "@/lib/queries/writing";

export const GET = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
  const { prompts, submissionCountByPrompt } = await listWritingPrompts(user.id, track);

  return Response.json({
    prompts: prompts.map((p) => ({
      id: p.id,
      taskType: p.taskType,
      title: p.title,
      titleZh: p.titleZh,
      minWords: p.minWords,
      suggestedMinutes: p.suggestedMinutes,
      submissionCount: submissionCountByPrompt.get(p.id) ?? 0,
    })),
  });
});
