import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { activeAiModel, AiUnavailableError, getTutorReply, isAiEnabled } from "../ai/client";
import { buildChatWindow, chatClaimIsFresh, chatDailyLimit } from "../chat-core";
import { db } from "../db";
import { chatMessages, chatStates } from "../db/schema";
import { formatLearnerContext } from "../learner-model-core";
import { getLearnerProfile } from "../queries/profile";
import { getCalendarDayForUser, recordActivityWith } from "../streak";
import { ConflictError, LimitExceededError } from "./errors";

export const SendChatMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export interface ChatReply {
  message: { id: string; role: "assistant"; content: string; createdAt: Date };
  remainingToday: number;
}

/** Guarded: profile context enriches the tutor but must never block a chat. */
async function tutorLearnerContext(userId: string): Promise<string | null> {
  try {
    const profile = await getLearnerProfile(userId);
    if (!profile) return null;
    return formatLearnerContext({
      goalTrack: profile.goalTrack,
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

interface ChatTurnClaim {
  claimId: string;
  day: string;
  limit: number;
}

/** Lock quota state and grant this user exactly one provider call at a time. */
export async function claimChatTurnForUser(
  userId: string,
  day: string,
  now = new Date(),
): Promise<ChatTurnClaim> {
  const limit = chatDailyLimit();
  return db.transaction(async (tx) => {
    await tx
      .insert(chatStates)
      .values({ userId, day, usedCount: 0, nextSequence: 1 })
      .onConflictDoNothing();
    const [state] = await tx
      .select()
      .from(chatStates)
      .where(eq(chatStates.userId, userId))
      .for("update")
      .limit(1);
    if (!state) throw new Error("Chat state missing after upsert");

    const usedCount = state.day === day ? state.usedCount : 0;
    const claimIsFresh = state.claimId !== null && chatClaimIsFresh(state.claimStartedAt, now);
    if (claimIsFresh) {
      throw new ConflictError("A tutor reply is already in progress", "chat_in_progress");
    }
    if (usedCount >= limit) {
      throw new LimitExceededError("Daily tutor message limit reached");
    }

    const claimId = crypto.randomUUID();
    await tx
      .update(chatStates)
      .set({ day, usedCount, claimId, claimStartedAt: now })
      .where(eq(chatStates.userId, userId));
    return { claimId, day, limit };
  });
}

async function clearChatClaim(userId: string, claimId: string): Promise<void> {
  await db
    .update(chatStates)
    .set({ claimId: null, claimStartedAt: null })
    .where(and(eq(chatStates.userId, userId), eq(chatStates.claimId, claimId)));
}

/**
 * One tutor turn: single-flight/quota claim → context → AI reply → persist
 * BOTH messages and consume quota atomically. Failed replies clear the claim,
 * store nothing, and consume no quota.
 */
export async function sendChatMessageForUser(userId: string, input: unknown): Promise<ChatReply> {
  const { content } = SendChatMessageSchema.parse(input);
  if (!isAiEnabled()) {
    throw new AiUnavailableError("No AI provider is configured");
  }

  const day = await getCalendarDayForUser(userId);
  const claim = await claimChatTurnForUser(userId, day);
  try {
    // Recent turns, chronological (query newest-first, then reverse).
    const recent = await db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, userId),
      orderBy: desc(chatMessages.sequence),
      limit: 20,
      columns: { role: true, content: true },
    });
    const window = buildChatWindow(recent.reverse(), content);

    const learnerContext = await tutorLearnerContext(userId);
    const reply = await getTutorReply({ learnerContext, messages: window });

    const now = new Date();
    const persisted = await db.transaction(async (tx) => {
      const [state] = await tx
        .select()
        .from(chatStates)
        .where(eq(chatStates.userId, userId))
        .for("update")
        .limit(1);
      if (!state || state.claimId !== claim.claimId) {
        throw new ConflictError("The tutor request was superseded", "chat_claim_superseded");
      }

      await tx.insert(chatMessages).values({
        userId,
        role: "user",
        content,
        day: claim.day,
        sequence: state.nextSequence,
        createdAt: now,
      });
      const [row] = await tx
        .insert(chatMessages)
        .values({
          userId,
          role: "assistant",
          content: reply,
          model: activeAiModel(),
          day: claim.day,
          sequence: state.nextSequence + 1,
          createdAt: new Date(now.getTime() + 1),
        })
        .returning();
      const usedCount = state.usedCount + 1;
      await tx
        .update(chatStates)
        .set({
          usedCount,
          nextSequence: state.nextSequence + 2,
          claimId: null,
          claimStartedAt: null,
        })
        .where(eq(chatStates.userId, userId));
      await recordActivityWith(tx, userId, now);
      return { assistant: row, usedCount };
    });

    return {
      message: {
        id: persisted.assistant.id,
        role: "assistant",
        content: persisted.assistant.content,
        createdAt: persisted.assistant.createdAt,
      },
      remainingToday: Math.max(0, claim.limit - persisted.usedCount),
    };
  } catch (error) {
    // Matching by claim id makes this safe even after a stale takeover.
    await clearChatClaim(userId, claim.claimId);
    throw error;
  }
}
