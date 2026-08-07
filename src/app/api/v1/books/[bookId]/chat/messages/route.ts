import { isAiEnabled } from "@/lib/ai/client";
import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { getBookChatPageData } from "@/lib/queries/book-chat";
import { NotFoundError } from "@/lib/services/errors";
import { sendBookChatMessageForUser } from "@/lib/services/book-chat";

// GET is never premium-gated: the shape carries the gate (`entitled`) so a
// downgraded user keeps read access to their own thread. 404 unknown book.
export const GET = apiHandler(async (req, ctx: { params: Promise<{ bookId: string }> }) => {
  const { user } = await requireOnboardedApi(req);
  const { bookId } = await ctx.params;
  const data = await getBookChatPageData(user.id, bookId);
  if (!data) throw new NotFoundError(`Unknown book: ${bookId}`);
  return Response.json({ enabled: isAiEnabled(), ...data });
});

// 503 keyless; 403 premium_required for free users; 409 single-flight or
// locked chapter; 429 at the exact per-(user, book) daily cap.
export const POST = apiHandler(async (req, ctx: { params: Promise<{ bookId: string }> }) => {
  const { user } = await requireOnboardedApi(req);
  const { bookId } = await ctx.params;
  const body = await readJson(req);
  const reply = await sendBookChatMessageForUser(user.id, {
    ...(body as Record<string, unknown>),
    bookId,
  });
  return Response.json(reply);
});
