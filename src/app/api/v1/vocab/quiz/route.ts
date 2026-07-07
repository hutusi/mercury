import { requireTrackApi, requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { buildQuiz } from "@/lib/queries/vocab";
import { submitQuizForUser } from "@/lib/services/vocab";

/**
 * Quiz options carry word ids and grading is id equality (same integrity
 * model as the web) — `questions` is empty when the track's pool is too small.
 */
export const GET = apiHandler(async (req) => {
  const { track } = await requireTrackApi(req);
  return Response.json(await buildQuiz(track));
});

export const POST = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = await readJson(req);
  const result = await submitQuizForUser(user.id, body);
  return Response.json(result);
});
