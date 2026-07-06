import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { retestMistakeForUser } from "@/lib/services/mistakes";

/**
 * 403 (integrity) unless the question is one of the caller's active mistakes —
 * the service re-derives the wrong-set so a mid-exam client cannot use this
 * endpoint to extract answer keys.
 */
export const POST = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = await readJson(req);
  return Response.json(await retestMistakeForUser(user.id, body));
});
