import { requireUserApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { createVocabMistakeSessionForUser } from "@/lib/services/vocab-quiz";

export const POST = apiHandler(async (req) => {
  const user = await requireUserApi(req);
  const body = await readJson(req);
  const wordId =
    typeof body === "object" && body !== null ? Reflect.get(body, "wordId") : undefined;
  return Response.json(await createVocabMistakeSessionForUser(user.id, wordId), { status: 201 });
});
