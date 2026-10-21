import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { planResponseBody } from "@/lib/plan-api";
import { getTodayRoute } from "@/lib/queries/plan";

export const GET = apiHandler(async (req) => {
  const { user, goalTrack, timeZone } = await requireOnboardedApi(req);
  // Materializes today's plan on first read (ADR 0033). hrefs are unlocalized
  // app paths; native clients map kind/refId to their own screens.
  const route = await getTodayRoute(user.id, goalTrack, timeZone);
  return Response.json(planResponseBody(route));
});
