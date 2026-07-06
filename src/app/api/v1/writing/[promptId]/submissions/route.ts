import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { submitWritingForUser } from "@/lib/services/writing";

/** AI-grades the essay; any AI failure degrades to status "self_assessed". */
export const POST = apiHandler(async (req, ctx: { params: Promise<{ promptId: string }> }) => {
  const user = await requireUserApi(req);
  const { promptId } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown> | null;

  const result = await submitWritingForUser(user.id, {
    ...(typeof body === "object" ? body : {}),
    promptId,
  });
  return Response.json(result);
});
