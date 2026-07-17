import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { apiTrackFilter } from "@/lib/track-filter";
import { getMistakesPageData } from "@/lib/mistakes";

export const GET = apiHandler(async (req) => {
  const { user, goalTrack } = await requireOnboardedApi(req);
  const track = apiTrackFilter(req, goalTrack);
  // Already sanitized view models: questions carry no correctIndex/explanation.
  return Response.json(await getMistakesPageData(user.id, track));
});
