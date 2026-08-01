import { isAiEnabled } from "@/lib/ai/client";
import { requireUserApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { serializeSettings } from "@/lib/api/resources/settings";
import { getMembershipForUser } from "@/lib/queries/membership";
import { resolveTier } from "@/lib/membership-core";
import { getSettings } from "@/lib/settings";

export const GET = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const [settings, membership] = await Promise.all([
    getSettings(user.id),
    getMembershipForUser(user.id),
  ]);
  const tier = resolveTier(membership ?? null);
  return Response.json({
    // role is nullable in the DB; null means the plugin's defaultRole.
    user: { id: user.id, name: user.name, email: user.email, role: user.role ?? "user" },
    membership: { tier, expiresAt: tier === "premium" ? (membership?.expiresAt ?? null) : null },
    settings: settings ? serializeSettings(settings) : null,
    aiEnabled: isAiEnabled(),
  });
});
