import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { createQuizSessionForUser } from "@/lib/services/vocab-quiz";

/**
 * Create an opaque, server-owned session. Public questions contain no word id
 * or answer-key signal; each option is submitted through the answers route.
 */
export const POST = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
  return Response.json(await createQuizSessionForUser(user.id, track), { status: 201 });
});
