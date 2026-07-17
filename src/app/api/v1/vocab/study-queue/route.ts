import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { apiTrackFilter } from "@/lib/track-filter";
import { getStudyQueue } from "@/lib/queries/vocab";

export const GET = apiHandler(async (req) => {
  const { user, goalTrack } = await requireOnboardedApi(req);
  const track = apiTrackFilter(req, goalTrack);
  const cards = await getStudyQueue(user.id, track);
  return Response.json({ cards });
});
