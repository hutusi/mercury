"use server";

import { ZodError } from "zod";
import { AiUnavailableError } from "../ai/client";
import { requireUser } from "../auth/session";
import { getSettings } from "../settings";
import { ConflictError, IntegrityError, LimitExceededError } from "../services/errors";
import { sendChatMessageForUser, type ChatReply } from "../services/chat";

export type SendTutorMessageResult =
  | ({ ok: true } & ChatReply)
  | {
      ok: false;
      error: "ai_unavailable" | "limit_reached" | "in_progress" | "invalid_input";
    };

/**
 * Returns a discriminated union instead of throwing: production Next masks
 * server-action error messages, so the client couldn't tell "limit reached"
 * from "AI down" otherwise.
 */
export async function sendTutorMessage(input: unknown): Promise<SendTutorMessageResult> {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  if (!settings?.activeTrack) throw new IntegrityError("Onboarding required");

  try {
    const reply = await sendChatMessageForUser(user.id, settings.activeTrack, input);
    return { ok: true, ...reply };
  } catch (error) {
    if (error instanceof AiUnavailableError) return { ok: false, error: "ai_unavailable" };
    if (error instanceof LimitExceededError) return { ok: false, error: "limit_reached" };
    if (error instanceof ConflictError && error.code === "chat_in_progress") {
      return { ok: false, error: "in_progress" };
    }
    // The textarea caps input client-side; this covers direct/tampered calls
    // so a validation throw can't strand the optimistic bubble.
    if (error instanceof ZodError) return { ok: false, error: "invalid_input" };
    throw error;
  }
}
