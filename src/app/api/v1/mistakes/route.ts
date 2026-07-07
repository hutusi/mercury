import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getMistakesPageData } from "@/lib/mistakes";

export const GET = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
  // Already sanitized view models: questions carry no correctIndex/explanation.
  return Response.json(await getMistakesPageData(user.id, track));
});
