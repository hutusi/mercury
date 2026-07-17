import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { apiTrackFilter } from "@/lib/track-filter";
import { listSpeakingPrompts } from "@/lib/queries/speaking";

export const GET = apiHandler(async (req) => {
  const { user, goalTrack } = await requireOnboardedApi(req);
  const track = apiTrackFilter(req, goalTrack);
  const { prompts, submissionCountByPrompt } = await listSpeakingPrompts(user.id, track);

  return Response.json({
    prompts: prompts.map((p) => ({
      id: p.id,
      partType: p.partType,
      title: p.title,
      titleZh: p.titleZh,
      prepSeconds: p.prepSeconds,
      speakSeconds: p.speakSeconds,
      submissionCount: submissionCountByPrompt.get(p.id) ?? 0,
    })),
  });
});
