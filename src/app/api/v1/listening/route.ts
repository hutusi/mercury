import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { listListeningExercises } from "@/lib/queries/listening";

export const GET = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
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
