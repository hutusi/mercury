import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { planResponseBody } from "@/lib/plan-api";
import { getTodayRoute } from "@/lib/queries/plan";
import { setPlanItemSkippedForUser } from "@/lib/services/plan";

/** Skip or un-skip a stop in today's plan; returns the updated plan. */
export const POST = apiHandler(async (req) => {
  const { user, goalTrack, timeZone } = await requireOnboardedApi(req);
  await setPlanItemSkippedForUser(user.id, timeZone, await readJson(req));
  const route = await getTodayRoute(user.id, goalTrack, timeZone);
  return Response.json(planResponseBody(route));
});
