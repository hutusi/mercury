import { isAiEnabled } from "@/lib/ai/client";
import { requireTrackApi } from "@/lib/api/auth";
import { apiHandler, readJson } from "@/lib/api/handler";
import { getChatPageData } from "@/lib/queries/chat";
import { sendChatMessageForUser } from "@/lib/services/chat";

export const GET = apiHandler(async (req) => {
  const { user } = await requireTrackApi(req);
  const { messages, dailyLimit, remainingToday } = await getChatPageData(user.id);
  return Response.json({
    enabled: isAiEnabled(),
    dailyLimit,
    remainingToday,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
});

// 503 ai_unavailable when keyless; 429 chat_limit_reached at the daily cap.
export const POST = apiHandler(async (req) => {
  const { user, track } = await requireTrackApi(req);
  const body = await readJson(req);
  const reply = await sendChatMessageForUser(user.id, track, body);
  return Response.json(reply);
});
