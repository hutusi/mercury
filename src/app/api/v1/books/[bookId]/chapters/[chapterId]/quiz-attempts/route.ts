import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { submitBookQuizForUser } from "@/lib/services/books";

export const POST = apiHandler(
  async (req, ctx: { params: Promise<{ bookId: string; chapterId: string }> }) => {
    const user = await requireUserApi(req);
    const { bookId, chapterId } = await ctx.params;
    const body = (await readJson(req)) as Record<string, unknown>;

    // Both path ids are load-bearing: a chapter under the wrong book is a 404.
    const graded = await submitBookQuizForUser(user.id, { ...body, bookId, chapterId });
    return Response.json(graded);
  },
);
