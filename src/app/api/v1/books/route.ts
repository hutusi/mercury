import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { listBooksForUser } from "@/lib/queries/books";

export const GET = apiHandler(async (req) => {
  const { user } = await requireOnboardedApi(req);
  return Response.json({ books: await listBooksForUser(user.id) });
});
