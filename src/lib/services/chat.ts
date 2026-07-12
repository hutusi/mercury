import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Track } from "../../content/types";
import { activeAiModel, AiUnavailableError, getTutorReply, isAiEnabled } from "../ai/client";
import { buildChatWindow, chatDailyLimit } from "../chat-core";
import { db } from "../db";
import { chatMessages } from "../db/schema";
import { formatLearnerContext } from "../learner-model-core";
import { getLearnerProfile } from "../queries/profile";
import { localDay, recordActivity } from "../streak";
import { LimitExceededError } from "./errors";

export const SendChatMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export interface ChatReply {
  message: { id: string; role: "assistant"; content: string; createdAt: Date };
  remainingToday: number;
}

/** Guarded: profile context enriches the tutor but must never block a chat. */
async function tutorLearnerContext(userId: string, track: Track): Promise<string | null> {
  try {
    const profile = await getLearnerProfile(userId);
    if (!profile) return null;
    return formatLearnerContext({
      goalTrack: profile.goalTrack,
      activeTrack: track,
      targetScore: profile.targetScore,
      examDate: profile.examDate,
      selfRatedLevel: profile.selfRatedLevel,
      skillEstimates: profile.skillEstimates,
      coachMemo: profile.coachMemo,
      recentCriteria: [],
      today: new Date(),
    });
  } catch (error) {
    console.error("[chat] learner context failed", error);
    return null;
  }
}

/**
 * One tutor turn: cap check → context window → AI reply → persist BOTH rows in
 * one transaction (a failed reply persists nothing, so the learner's message
 * is never stranded and the cap only counts answered turns).
 */
export async function sendChatMessageForUser(
  userId: string,
  track: Track,
  input: unknown,
): Promise<ChatReply> {
  const { content } = SendChatMessageSchema.parse(input);
  if (!isAiEnabled()) {
    throw new AiUnavailableError("No AI provider is configured");
  }

  const limit = chatDailyLimit();
  const day = localDay();
  const [sent] = await db
    .select({ n: count() })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.day, day),
        eq(chatMessages.role, "user"),
      ),
    );
  const sentToday = sent?.n ?? 0;
  if (sentToday >= limit) {
    throw new LimitExceededError("Daily tutor message limit reached");
  }

  // Recent turns, chronological (query newest-first, then reverse).
  const recent = await db.query.chatMessages.findMany({
    where: eq(chatMessages.userId, userId),
    orderBy: desc(chatMessages.createdAt),
    limit: 20,
    columns: { role: true, content: true },
  });
  const window = buildChatWindow(recent.reverse(), content);

  const learnerContext = await tutorLearnerContext(userId, track);
  const reply = await getTutorReply({ learnerContext, messages: window });

  // Explicit timestamps: both rows commit together and must order user-first.
  const now = new Date();
  const assistant = await db.transaction(async (tx) => {
    await tx.insert(chatMessages).values({ userId, role: "user", content, day, createdAt: now });
    const [row] = await tx
      .insert(chatMessages)
      .values({
        userId,
        role: "assistant",
        content: reply,
        model: activeAiModel(),
        day,
        createdAt: new Date(now.getTime() + 1),
      })
      .returning();
    return row;
  });
  await recordActivity(userId);

  return {
    message: {
      id: assistant.id,
      role: "assistant",
      content: assistant.content,
      createdAt: assistant.createdAt,
    },
    remainingToday: Math.max(0, limit - sentToday - 1),
  };
}
