import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { saveExamProgressForUser } from "@/lib/services/exams";

/**
 * Autosave. Always 204: late or out-of-section answers are silently dropped
 * (the client keeps its local state; the next GET reflects what was accepted).
 */
export const PATCH = apiHandler(async (req, ctx: { params: Promise<{ attemptId: string }> }) => {
  const user = await requireUserApi(req);
  const { attemptId } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown> | null;

  await saveExamProgressForUser(user.id, {
    ...(typeof body === "object" ? body : {}),
    attemptId,
  });
  return new Response(null, { status: 204 });
});
