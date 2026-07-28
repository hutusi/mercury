import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getBookForUser } from "@/lib/queries/books";
import { NotFoundError } from "@/lib/services/errors";

export const GET = apiHandler(async (req, ctx: { params: Promise<{ bookId: string }> }) => {
  const user = await requireUserApi(req);
  const { bookId } = await ctx.params;

  const data = await getBookForUser(user.id, bookId);
  if (!data) throw new NotFoundError(`Unknown book: ${bookId}`);
  return Response.json(data);
});
