import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { answerQuizSessionForUser } from "@/lib/services/vocab-quiz";

export const POST = apiHandler(async (req, ctx: { params: Promise<{ sessionId: string }> }) => {
  const user = await requireUserApi(req);
  const { sessionId } = await ctx.params;
  const body = await readJson(req);
  return Response.json(
    await answerQuizSessionForUser(user.id, {
      ...(typeof body === "object" && body !== null ? body : {}),
      sessionId,
    }),
  );
});
