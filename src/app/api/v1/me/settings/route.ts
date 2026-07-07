import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { setActiveTrackForUser } from "@/lib/services/settings";

export const PUT = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = (await readJson(req)) as { track?: unknown } | null;
  const settings = await setActiveTrackForUser(user.id, body?.track);
  return Response.json({
    settings: {
      activeTrack: settings.activeTrack,
      dailyGoal: settings.dailyGoal,
      onboardedAt: settings.onboardedAt,
    },
  });
});
