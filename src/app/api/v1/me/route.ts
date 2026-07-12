import { isAiEnabled } from "@/lib/ai/client";
import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { serializeSettings } from "@/lib/api/resources/settings";
import { getSettings } from "@/lib/settings";

export const GET = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const settings = await getSettings(user.id);
  return Response.json({
    user: { id: user.id, name: user.name, email: user.email },
    settings: settings ? serializeSettings(settings) : null,
    aiEnabled: isAiEnabled(),
  });
});
