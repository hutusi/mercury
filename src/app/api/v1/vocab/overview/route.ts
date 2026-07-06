import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getVocabOverview } from "@/lib/queries/vocab";

export const GET = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
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
