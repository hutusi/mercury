import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { retestVocabMistakeForUser } from "@/lib/services/mistakes";

export const POST = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = await readJson(req);
  return Response.json(await retestVocabMistakeForUser(user.id, body));
});
