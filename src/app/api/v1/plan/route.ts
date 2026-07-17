import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getDailyPlan } from "@/lib/queries/plan";

export const GET = apiHandler(async (req) => {
  const { user, goalTrack, timeZone } = await requireOnboardedApi(req);
  const plan = await getDailyPlan(user.id, goalTrack, timeZone);
  // hrefs are unlocalized app paths; native clients map kind/refId to their
  // own screens and can ignore them.
  return Response.json(plan);
});
