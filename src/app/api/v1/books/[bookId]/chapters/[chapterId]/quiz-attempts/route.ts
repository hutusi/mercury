import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { submitBookQuizForUser } from "@/lib/services/books";

export const POST = apiHandler(async (req, ctx: { params: Promise<{ chapterId: string }> }) => {
  const user = await requireUserApi(req);
  const { chapterId } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown>;

  const graded = await submitBookQuizForUser(user.id, { ...body, chapterId });
  return Response.json(graded);
});
