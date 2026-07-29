import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getBookChapterForReader } from "@/lib/queries/books";
import { ConflictError, NotFoundError } from "@/lib/services/errors";

export const GET = apiHandler(
  async (req, ctx: { params: Promise<{ bookId: string; chapterId: string }> }) => {
    const user = await requireUserApi(req);
    const { bookId, chapterId } = await ctx.params;

    // Sanitized payload only; a still-locked chapter is a 409, mirroring the
    // web reader's redirect (the lock is server-enforced, not a UI nicety).
    const data = await getBookChapterForReader(user.id, bookId, chapterId);
    if (!data) throw new NotFoundError(`Unknown book chapter: ${chapterId}`);
    if (data.status === "locked") {
      throw new ConflictError("Previous chapter quiz not submitted", "chapter_locked");
    }
    return Response.json(data);
  },
);
