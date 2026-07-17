import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { apiTrackFilter } from "@/lib/track-filter";
import { getVocabOverview } from "@/lib/queries/vocab";

export const GET = apiHandler(async (req) => {
  const { user, goalTrack } = await requireOnboardedApi(req);
  const track = apiTrackFilter(req, goalTrack);
  const { words, startedIds, dueIds, dueCount, freshCount, learnedCount } = await getVocabOverview(
    user.id,
    track,
  );

  return Response.json({
    words: words.map((w) => ({
      ...w,
      started: startedIds.has(w.id),
      due: dueIds.has(w.id),
    })),
    dueCount,
    freshCount,
    learnedCount,
  });
});
