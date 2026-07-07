import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { submitExamSectionForUser } from "@/lib/services/exams";

/**
 * Advance to the next section (stamping its deadline server-side) or, on the
 * final section, grade the whole exam against the unsanitized content. Late
 * answers are discarded — only prior autosaves count.
 */
export const POST = apiHandler(
  async (req, ctx: { params: Promise<{ attemptId: string; sectionId: string }> }) => {
    const user = await requireUserApi(req);
    const { attemptId, sectionId } = await ctx.params;
    const body = (await readJson(req)) as Record<string, unknown> | null;

    const result = await submitExamSectionForUser(user.id, {
      ...(typeof body === "object" ? body : {}),
      attemptId,
      sectionId,
    });
    return Response.json({ ...result, serverTime: Date.now() });
  },
);
