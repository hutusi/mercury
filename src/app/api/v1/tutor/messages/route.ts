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

// 503 keyless; 409 single-flight conflict; 429 at the exact daily cap.
export const POST = apiHandler(async (req) => {
  const { user } = await requireTrackApi(req);
  const body = await readJson(req);
  const reply = await sendChatMessageForUser(user.id, body);
  return Response.json(reply);
});
