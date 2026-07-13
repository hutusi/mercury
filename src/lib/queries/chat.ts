import { and, count, desc, eq } from "drizzle-orm";
import { chatDailyLimit } from "../chat-core";
import { db } from "../db";
import { chatMessages } from "../db/schema";
import { getCalendarDayForUser } from "../streak";

const HISTORY_LIMIT = 50;

/** Recent thread (chronological) plus today's remaining message quota. */
export async function getChatPageData(userId: string) {
  const today = await getCalendarDayForUser(userId);
  const [rows, sent] = await Promise.all([
    db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, userId),
      orderBy: desc(chatMessages.createdAt),
      limit: HISTORY_LIMIT,
    }),
    db
      .select({ n: count() })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.day, today),
          eq(chatMessages.role, "user"),
        ),
      ),
  ]);

  const dailyLimit = chatDailyLimit();
  return {
    messages: rows.reverse(),
    dailyLimit,
    remainingToday: Math.max(0, dailyLimit - (sent[0]?.n ?? 0)),
  };
}
