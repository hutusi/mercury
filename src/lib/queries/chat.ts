import { desc, eq } from "drizzle-orm";
import { chatDailyLimit } from "../chat-core";
import { db } from "../db";
import { chatMessages, chatStates } from "../db/schema";
import { getCalendarDayForUser } from "../streak";

const HISTORY_LIMIT = 50;

/** Recent thread (chronological) plus today's remaining message quota. */
export async function getChatPageData(userId: string) {
  const today = await getCalendarDayForUser(userId);
  const [rows, state] = await Promise.all([
    db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, userId),
      orderBy: desc(chatMessages.sequence),
      limit: HISTORY_LIMIT,
    }),
    db.query.chatStates.findFirst({ where: eq(chatStates.userId, userId) }),
  ]);

  const dailyLimit = chatDailyLimit();
  const usedToday = state?.day === today ? state.usedCount : 0;
  return {
    messages: rows.reverse(),
    dailyLimit,
    remainingToday: Math.max(0, dailyLimit - usedToday),
  };
}
