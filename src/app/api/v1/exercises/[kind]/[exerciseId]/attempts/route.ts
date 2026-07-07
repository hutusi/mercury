import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { submitExerciseAttemptForUser } from "@/lib/services/attempts";

/**
 * Grade an MCQ attempt. The response's perQuestion carries correctIndex and
 * explanationZh — the key ships only after answering, matching the web flow.
 */
export const POST = apiHandler(
  async (req, ctx: { params: Promise<{ kind: string; exerciseId: string }> }) => {
    const user = await requireUserApi(req);
    const { kind, exerciseId } = await ctx.params;
    const body = (await readJson(req)) as Record<string, unknown> | null;

    // kind/refId come from the URL; the service schema validates both.
    const result = await submitExerciseAttemptForUser(user.id, {
      ...(typeof body === "object" ? body : {}),
      kind,
      refId: exerciseId,
    });
    return Response.json(result);
  },
);
