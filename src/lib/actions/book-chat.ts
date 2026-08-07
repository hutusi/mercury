"use server";

import { ZodError } from "zod";
import { AiUnavailableError } from "../ai/client";
import { requireUser } from "../auth/session";
import { getOnboardedState } from "../settings";
import {
  ConflictError,
  IntegrityError,
  LimitExceededError,
  PremiumRequiredError,
} from "../services/errors";
import { sendBookChatMessageForUser, type BookChatReply } from "../services/book-chat";

export type SendBookChatMessageResult =
  | ({ ok: true } & BookChatReply)
  | {
      ok: false;
      error:
        "ai_unavailable" | "premium_required" | "limit_reached" | "in_progress" | "invalid_input";
    };

/**
 * Returns a discriminated union instead of throwing (same rationale as
 * sendTutorMessage: production Next masks action error messages). NotFound
 * and chapter_locked rethrow — a legitimate reader page cannot produce them,
 * since the entry points only render on an unlocked chapter.
 */
export async function sendBookChatMessage(input: unknown): Promise<SendBookChatMessageResult> {
  const user = await requireUser();
  if (!(await getOnboardedState(user.id))) throw new IntegrityError("Onboarding required");

  try {
    const reply = await sendBookChatMessageForUser(user.id, input);
    return { ok: true, ...reply };
  } catch (error) {
    if (error instanceof AiUnavailableError) return { ok: false, error: "ai_unavailable" };
    // Reachable only when entitlement lapses mid-session (the tier gate hides
    // the entry points); the panel maps it to its generic failed state.
    if (error instanceof PremiumRequiredError) return { ok: false, error: "premium_required" };
    if (error instanceof LimitExceededError) return { ok: false, error: "limit_reached" };
    if (
      error instanceof ConflictError &&
      (error.code === "book_chat_in_progress" || error.code === "book_chat_claim_superseded")
    ) {
      return { ok: false, error: "in_progress" };
    }
    if (error instanceof ZodError) return { ok: false, error: "invalid_input" };
    throw error;
  }
}
