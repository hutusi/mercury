import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { undoGradeForUser } from "@/lib/services/vocab";

/** Undo a flashcard grade (the card's latest review, within 10 minutes). */
export const POST = apiHandler(async (req, ctx: { params: Promise<{ reviewId: string }> }) => {
  const user = await requireUserApi(req);
  const { reviewId } = await ctx.params;
  return Response.json(await undoGradeForUser(user.id, { reviewId }));
});
