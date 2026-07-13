import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getDailyPlan } from "@/lib/queries/plan";

export const GET = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
  const plan = await getDailyPlan(user.id, track);
  // hrefs are unlocalized app paths; native clients map kind/refId to their
  // own screens and can ignore them.
  return Response.json(plan);
});
