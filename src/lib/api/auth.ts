import type { Track } from "../../content/types";
import { auth } from "../auth/auth";
import { getLearnerProfile } from "../queries/profile";
import { getSettings } from "../settings";
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
  const [settings, profile] = await Promise.all([getSettings(user.id), getLearnerProfile(user.id)]);
  if (!settings || !profile?.goalTrack) {
    throw new ApiError(403, "onboarding_required", "Complete onboarding first");
  }
  return { user, goalTrack: profile.goalTrack, timeZone: settings.timeZone };
}

/**
 * API twin of `requireTrack()`: 403 until the user has picked a track.
 * @deprecated The track is no longer an app mode — use `requireOnboardedApi()`.
 */
export async function requireTrackApi(req: Request): Promise<{
  user: Awaited<ReturnType<typeof requireUserApi>>;
  track: Track;
  dailyGoal: number;
}> {
  const user = await requireUserApi(req);
  const settings = await getSettings(user.id);
  if (!settings?.activeTrack) {
    throw new ApiError(403, "onboarding_required", "Pick a learning track first");
  }
  return { user, track: settings.activeTrack, dailyGoal: settings.dailyGoal };
}
