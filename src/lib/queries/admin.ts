import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { memberships, user } from "../db/schema";

/** No pagination yet — the user count is small; the page notes the cap when hit. */
export const ADMIN_USER_LIST_LIMIT = 200;

/**
 * Admin-only read (the caller gates the actor via requireAdmin). One LEFT JOIN
 * instead of better-auth's listUsers: that API can't join memberships and
 * would cost a second query plus a merge.
 */
export async function listUsersWithMembership() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      membershipTier: memberships.tier,
      membershipExpiresAt: memberships.expiresAt,
    })
    .from(user)
    .leftJoin(memberships, eq(memberships.userId, user.id))
    .orderBy(desc(user.createdAt))
    .limit(ADMIN_USER_LIST_LIMIT);
}
