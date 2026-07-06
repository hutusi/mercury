import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { submitSpeakingForUser } from "@/lib/services/speaking";

/**
 * The client does speech-to-text on-device (SFSpeechRecognizer on iOS, Web
 * Speech in the browser) and POSTs the transcript; any AI-grading failure
 * degrades to status "self_assessed".
 */
export const POST = apiHandler(async (req, ctx: { params: Promise<{ promptId: string }> }) => {
  const user = await requireUserApi(req);
  const { promptId } = await ctx.params;
  const body = (await readJson(req)) as Record<string, unknown> | null;

  const result = await submitSpeakingForUser(user.id, {
    ...(typeof body === "object" ? body : {}),
    promptId,
  });
  return Response.json(result);
});
