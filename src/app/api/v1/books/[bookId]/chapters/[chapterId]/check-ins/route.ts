import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { answerBookCheckInForUser } from "@/lib/services/books";

export const POST = apiHandler(async (req, ctx: { params: Promise<{ chapterId: string }> }) => {
  const user = await requireUserApi(req);
  const { chapterId } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown>;

  // Stateless reveal: 404 for unknown/quiz question ids (the oracle guard),
  // 409 chapter_locked before the chapter is readable.
  const result = await answerBookCheckInForUser(user.id, { ...body, chapterId });
  return Response.json(result);
});
