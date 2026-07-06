import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { gradeCardForUser } from "@/lib/services/vocab";

export const POST = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = await readJson(req);
  const result = await gradeCardForUser(user.id, body);
  return Response.json(result);
});
