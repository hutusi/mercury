import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { listSpeakingPrompts } from "@/lib/queries/speaking";

export const GET = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
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
