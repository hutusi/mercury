import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { listReadingExercises } from "@/lib/queries/reading";

export const GET = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
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
