"use server";

import { requireOnboarded } from "../settings";
import { ConflictError, NotFoundError } from "../services/errors";
import { setPlanItemSkippedForUser } from "../services/plan";

/**
 * Skip / un-skip a stop in today's route. Typed failures (server-action
 * errors are masked in prod): "day_changed" means the screen outlived its
 * day and should refresh. The client refreshes the route itself in a
 * separate transition — never revalidatePath here (AGENTS.md).
 */
export async function setPlanItemSkipped(input: {
  day: string;
  key: string;
  skipped: boolean;
}): Promise<{ ok: true } | { ok: false; reason: "day_changed" | "not_found" }> {
  const { user, timeZone } = await requireOnboarded();
  try {
    await setPlanItemSkippedForUser(user.id, timeZone, input);
    return { ok: true };
  } catch (err) {
    if (err instanceof ConflictError) return { ok: false, reason: "day_changed" };
    if (err instanceof NotFoundError) return { ok: false, reason: "not_found" };
    throw err;
  }
}
