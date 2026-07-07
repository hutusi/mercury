import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getStudyQueue } from "@/lib/queries/vocab";

export const GET = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
  const cards = await getStudyQueue(user.id, track);
  return Response.json({ cards });
});
