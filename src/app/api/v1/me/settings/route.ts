import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { serializeSettings } from "@/lib/api/resources/settings";
import { completeOnboardingForUser, updateSettingsForUser } from "@/lib/services/settings";

export const PUT = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = await readJson(req);
  const settings = await completeOnboardingForUser(user.id, body);
  return Response.json({ settings: serializeSettings(settings) });
});

// Partial preference update; `track` intentionally stays PUT-only.
export const PATCH = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = await readJson(req);
  const settings = await updateSettingsForUser(user.id, body);
  return Response.json({ settings: serializeSettings(settings) });
});
