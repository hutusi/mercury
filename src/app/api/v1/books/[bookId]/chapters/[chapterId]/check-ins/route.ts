import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { answerBookCheckInForUser } from "@/lib/services/books";

export const POST = apiHandler(
  async (req, ctx: { params: Promise<{ bookId: string; chapterId: string }> }) => {
    const user = await requireUserApi(req);
    const { bookId, chapterId } = await ctx.params;
    const body = (await readJson(req)) as Record<string, unknown>;

    // Stateless reveal: 404 for unknown/quiz question ids (the oracle guard)
    // and for a chapter under the wrong book; 409 chapter_locked before the
    // chapter is readable.
    const result = await answerBookCheckInForUser(user.id, { ...body, bookId, chapterId });
    return Response.json(result);
  },
);
