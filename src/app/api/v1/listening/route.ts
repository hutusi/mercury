import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { apiTrackFilter } from "@/lib/track-filter";
import { listListeningExercises } from "@/lib/queries/listening";

export const GET = apiHandler(async (req) => {
  const { user, goalTrack } = await requireOnboardedApi(req);
  const track = apiTrackFilter(req, goalTrack);
  const { exercises, bestByExercise } = await listListeningExercises(user.id, track);

  return Response.json({
    exercises: exercises.map((ex) => ({
      id: ex.id,
      title: ex.title,
      titleZh: ex.titleZh,
      style: ex.style,
      questionCount: ex.questions.length,
      best: bestByExercise.get(ex.id) ?? null,
    })),
  });
});
