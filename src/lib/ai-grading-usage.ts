import { and, eq } from "drizzle-orm";
import { aiGradingDailyLimit, GRADING_CLAIM_STALE_MS } from "./ai-grading-core";
import { db, type DbExecutor } from "./db";
import { aiGradingRequests, aiUsageDays, type AiGradingKind } from "./db/schema";
import { getCalendarDayForUser } from "./streak";
import { ConflictError, LimitExceededError } from "./services/errors";

interface ClaimInput {
  userId: string;
  requestId: string;
  kind: AiGradingKind;
  scope: string;
  inputHash: string;
  /** False for the supported keyless self-assessment path. */
  charge: boolean;
  now?: Date;
}

export type GradingClaim =
  { disposition: "claimed"; claimId: string } | { disposition: "completed"; submissionId: string };

/** A unique violation on the partial active-scope index (Postgres 23505). */
function isActiveScopeConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23505" &&
    (error as { constraint?: unknown }).constraint === "ai_grading_requests_active_scope_idx"
  );
}

/**
 * Claim one provider call under the per-user/day row lock. The request id is
 * idempotent; a fresh in-flight lease returns 409, while a lease older than
 * two minutes can be reclaimed with a new claim id.
 */
export async function claimGradingRequest(input: ClaimInput): Promise<GradingClaim> {
  const now = input.now ?? new Date();
  const day = await getCalendarDayForUser(input.userId, now);
  const limit = aiGradingDailyLimit();

  return db.transaction(async (tx) => {
    await tx
      .insert(aiUsageDays)
      .values({ userId: input.userId, day, gradingCalls: 0 })
      .onConflictDoNothing();
    const [usage] = await tx
      .select()
      .from(aiUsageDays)
      .where(and(eq(aiUsageDays.userId, input.userId), eq(aiUsageDays.day, day)))
      .for("update")
      .limit(1);
    if (!usage) throw new Error("AI usage row missing after upsert");

    const [existing] = await tx
      .select()
      .from(aiGradingRequests)
      .where(
        and(
          eq(aiGradingRequests.userId, input.userId),
          eq(aiGradingRequests.requestId, input.requestId),
        ),
      )
      .limit(1);

    if (existing) {
      if (
        existing.kind !== input.kind ||
        existing.scope !== input.scope ||
        existing.inputHash !== input.inputHash
      ) {
        throw new ConflictError(
          "The request id was already used for different grading input",
          "grading_request_conflict",
        );
      }
      if (existing.status === "completed" && existing.submissionId) {
        return { disposition: "completed", submissionId: existing.submissionId };
      }
      const fresh =
        existing.status === "in_progress" &&
        now.getTime() - existing.startedAt.getTime() < GRADING_CLAIM_STALE_MS;
      if (fresh) {
        throw new ConflictError("Grading is already in progress", "grading_in_progress");
      }
    }

    // A failed request id can race a different id for the same grading scope.
    // Check the scope for both new and reclaimed ids so the partial unique
    // index remains a last line of defense rather than surfacing as a 500.
    const [activeScope] = await tx
      .select({ requestId: aiGradingRequests.requestId, startedAt: aiGradingRequests.startedAt })
      .from(aiGradingRequests)
      .where(
        and(
          eq(aiGradingRequests.userId, input.userId),
          eq(aiGradingRequests.scope, input.scope),
          eq(aiGradingRequests.status, "in_progress"),
        ),
      )
      .limit(1);
    if (activeScope && activeScope.requestId !== input.requestId) {
      if (now.getTime() - activeScope.startedAt.getTime() < GRADING_CLAIM_STALE_MS) {
        throw new ConflictError("Grading is already in progress", "grading_in_progress");
      }
      await tx
        .update(aiGradingRequests)
        .set({ status: "failed", completedAt: now })
        .where(
          and(
            eq(aiGradingRequests.userId, input.userId),
            eq(aiGradingRequests.requestId, activeScope.requestId),
            eq(aiGradingRequests.status, "in_progress"),
          ),
        );
    }

    if (input.charge && usage.gradingCalls >= limit) {
      throw new LimitExceededError("Daily AI grading limit reached", "ai_grading_limit_reached");
    }

    const claimId = crypto.randomUUID();
    try {
      if (existing) {
        await tx
          .update(aiGradingRequests)
          .set({
            day,
            status: "in_progress",
            claimId,
            submissionId: null,
            startedAt: now,
            completedAt: null,
          })
          .where(
            and(
              eq(aiGradingRequests.userId, input.userId),
              eq(aiGradingRequests.requestId, input.requestId),
            ),
          );
      } else {
        await tx.insert(aiGradingRequests).values({
          userId: input.userId,
          requestId: input.requestId,
          kind: input.kind,
          scope: input.scope,
          inputHash: input.inputHash,
          day,
          status: "in_progress",
          claimId,
          startedAt: now,
        });
      }
    } catch (error) {
      // The activeScope pre-check above only serializes claims resolving to the
      // same usage-day row; two concurrent same-scope claims straddling the
      // learner's local midnight lock different rows, so the partial unique
      // index is the real arbiter. Surface its loser as a clean 409, not a 500.
      if (isActiveScopeConflict(error)) {
        throw new ConflictError("Grading is already in progress", "grading_in_progress");
      }
      throw error;
    }
    if (input.charge) {
      await tx
        .update(aiUsageDays)
        .set({ gradingCalls: usage.gradingCalls + 1 })
        .where(and(eq(aiUsageDays.userId, input.userId), eq(aiUsageDays.day, day)));
    }
    return { disposition: "claimed", claimId };
  });
}

/** Complete a claim inside the same transaction that publishes its submission. */
export async function completeGradingRequestWith(
  executor: DbExecutor,
  input: { userId: string; requestId: string; claimId: string; submissionId: string; now?: Date },
): Promise<void> {
  const [completed] = await executor
    .update(aiGradingRequests)
    .set({
      status: "completed",
      submissionId: input.submissionId,
      completedAt: input.now ?? new Date(),
    })
    .where(
      and(
        eq(aiGradingRequests.userId, input.userId),
        eq(aiGradingRequests.requestId, input.requestId),
        eq(aiGradingRequests.claimId, input.claimId),
        eq(aiGradingRequests.status, "in_progress"),
      ),
    )
    .returning({ requestId: aiGradingRequests.requestId });
  if (!completed) {
    throw new ConflictError("The grading claim was superseded", "grading_claim_superseded");
  }
}

/** Release a failed retry claim; a later request may try again and consumes a new call. */
export async function failGradingRequest(input: {
  userId: string;
  requestId: string;
  claimId: string;
}): Promise<void> {
  await db
    .update(aiGradingRequests)
    .set({ status: "failed", completedAt: new Date() })
    .where(
      and(
        eq(aiGradingRequests.userId, input.userId),
        eq(aiGradingRequests.requestId, input.requestId),
        eq(aiGradingRequests.claimId, input.claimId),
        eq(aiGradingRequests.status, "in_progress"),
      ),
    );
}
