import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { serializeSettings } from "@/lib/api/resources/settings";
import { setActiveTrackForUser, setRemindersEnabledForUser } from "@/lib/services/settings";

export const PUT = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = (await readJson(req)) as { track?: unknown } | null;
  const settings = await setActiveTrackForUser(user.id, body?.track);
  return Response.json({ settings: serializeSettings(settings) });
});

// Partial update; `track` intentionally stays PUT-only (it doubles as onboarding).
export const PATCH = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = (await readJson(req)) as { remindersEnabled?: unknown } | null;
  const settings = await setRemindersEnabledForUser(user.id, body?.remindersEnabled);
  return Response.json({ settings: serializeSettings(settings) });
});
