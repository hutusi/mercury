import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getReadingExerciseSanitized } from "@/lib/queries/reading";
import { NotFoundError } from "@/lib/services/errors";

export const GET = apiHandler(async (req, ctx: { params: Promise<{ exerciseId: string }> }) => {
  await requireUserApi(req);
  const { exerciseId } = await ctx.params;

  const exercise = await getReadingExerciseSanitized(exerciseId);
  if (!exercise) throw new NotFoundError(`Unknown reading exercise: ${exerciseId}`);
  return Response.json(exercise);
});
