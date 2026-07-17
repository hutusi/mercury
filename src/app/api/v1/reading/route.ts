import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { apiTrackFilter } from "@/lib/track-filter";
import { listReadingExercises } from "@/lib/queries/reading";

export const GET = apiHandler(async (req) => {
  const { user, goalTrack } = await requireOnboardedApi(req);
  const track = apiTrackFilter(req, goalTrack);
  const { exercises, bestByExercise } = await listReadingExercises(user.id, track);

  return Response.json({
    // List rows never include questions — the raw rows carry answer keys.
    exercises: exercises.map((ex) => ({
      id: ex.id,
      title: ex.title,
      titleZh: ex.titleZh,
      genre: ex.genre,
      questionCount: ex.questions.length,
      suggestedMinutes: ex.suggestedMinutes,
      best: bestByExercise.get(ex.id) ?? null,
    })),
  });
});
