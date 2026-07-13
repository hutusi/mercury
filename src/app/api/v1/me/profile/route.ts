import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { serializeProfile } from "@/lib/api/resources/profile";
import { getLearnerProfile } from "@/lib/queries/profile";
import { upsertLearnerProfileForUser } from "@/lib/services/profile";

export const GET = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const profile = await getLearnerProfile(user.id);
  return Response.json({ profile: serializeProfile(profile) });
});

// Partial update of the goal fields; skillEstimates/coachMemo are server-owned
// and silently absent from the accepted body (schema strips them).
export const PATCH = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = await readJson(req);
  const profile = await upsertLearnerProfileForUser(user.id, body ?? {});
  return Response.json({ profile: serializeProfile(profile) });
});
