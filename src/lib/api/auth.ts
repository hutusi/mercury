import type { Track } from "../../content/types";
import { auth } from "../auth/auth";
import { getOnboardedState } from "../settings";
import { ApiError } from "./errors";

/**
 * API twin of `requireUser()`: resolves the session from the request headers
 * (the bearer plugin translates `Authorization: Bearer` for cookie-less native
 * clients) and throws a 401 envelope instead of redirecting to /login.
 */
export async function requireUserApi(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) throw new ApiError(401, "unauthorized", "Authentication required");
  return session.user;
}

/** API twin of `requireOnboarded()`: 403 until the user has completed onboarding. */
export async function requireOnboardedApi(req: Request): Promise<{
  user: Awaited<ReturnType<typeof requireUserApi>>;
  goalTrack: Track;
  timeZone: string;
}> {
  const user = await requireUserApi(req);
  const onboarded = await getOnboardedState(user.id);
  if (!onboarded) {
    throw new ApiError(403, "onboarding_required", "Complete onboarding first");
  }
  return { user, goalTrack: onboarded.goalTrack, timeZone: onboarded.settings.timeZone };
}
