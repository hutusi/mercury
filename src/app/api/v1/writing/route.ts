import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { apiTrackFilter } from "@/lib/track-filter";
import { listWritingPrompts } from "@/lib/queries/writing";

export const GET = apiHandler(async (req) => {
  const { user, goalTrack } = await requireOnboardedApi(req);
  const track = apiTrackFilter(req, goalTrack);
  const { prompts, submissionCountByPrompt } = await listWritingPrompts(user.id, track);

  return Response.json({
    prompts: prompts.map((p) => ({
      id: p.id,
      track: p.track,
      taskType: p.taskType,
      title: p.title,
      titleZh: p.titleZh,
      minWords: p.minWords,
      suggestedMinutes: p.suggestedMinutes,
      submissionCount: submissionCountByPrompt.get(p.id) ?? 0,
    })),
  });
});
