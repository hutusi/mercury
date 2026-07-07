import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getListeningExerciseSanitized } from "@/lib/queries/listening";
import { NotFoundError } from "@/lib/services/errors";

export const GET = apiHandler(async (req, ctx: { params: Promise<{ exerciseId: string }> }) => {
  await requireUserApi(req);
  const { exerciseId } = await ctx.params;

  // Includes the script — the native client renders it via on-device TTS.
  const exercise = await getListeningExerciseSanitized(exerciseId);
  if (!exercise) throw new NotFoundError(`Unknown listening exercise: ${exerciseId}`);
  return Response.json(exercise);
});
