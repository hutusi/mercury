import { z } from "zod";
import { EXAM_TRACKS, TRACKS, TrackSchema, type ExamTrack, type Track } from "../content/types";

/**
 * Per-feature track filtering (?track=…). The track is a content attribute,
 * not an app mode: an absent or invalid param defaults to the user's goal
 * track, and "all" lifts the filter entirely (null into the queries).
 */

export type TrackFilter = Track | "all";
export type ExamTrackFilter = ExamTrack | "all";

export const TrackFilterSchema = z.enum([...TRACKS, "all"]);
export const ExamTrackFilterSchema = z.enum([...EXAM_TRACKS, "all"]);

/** Chip order on list pages: the unfiltered view first, then concrete tracks. */
export const TRACK_FILTER_OPTIONS = ["all", ...TRACKS] as const;
export const EXAM_TRACK_FILTER_OPTIONS = ["all", ...EXAM_TRACKS] as const;

/** Web-side parse: absent/invalid input degrades to the goal-track default. */
export function parseTrackFilter(
  raw: string | undefined,
  goalTrack: Track,
): { filter: TrackFilter; track: Track | null } {
  const parsed = TrackFilterSchema.safeParse(raw);
  const filter = parsed.success ? parsed.data : goalTrack;
  return { filter, track: filter === "all" ? null : filter };
}

/** Exam listing: a business goal defaults to all exams, an exam goal to its own. */
export function parseExamTrackFilter(
  raw: string | undefined,
  goalTrack: Track,
): { filter: ExamTrackFilter; track: ExamTrack | null } {
  const fallback: ExamTrackFilter = goalTrack === "business" ? "all" : goalTrack;
  const parsed = ExamTrackFilterSchema.safeParse(raw);
  const filter = parsed.success ? parsed.data : fallback;
  return { filter, track: filter === "all" ? null : filter };
}

function trackParam(req: Request): string | undefined {
  return new URL(req.url).searchParams.get("track") ?? undefined;
}

/** API-side parse: absent = goal default; invalid throws a ZodError (422 envelope). */
export function apiTrackFilter(req: Request, goalTrack: Track): Track | null {
  const raw = trackParam(req);
  if (raw === undefined) return goalTrack;
  const filter = TrackFilterSchema.parse(raw);
  return filter === "all" ? null : filter;
}

/** API exam listing: same contract with the toeic|ielts|all enum. */
export function apiExamTrackFilter(req: Request, goalTrack: Track): ExamTrack | null {
  const raw = trackParam(req);
  if (raw === undefined) return goalTrack === "business" ? null : goalTrack;
  const filter = ExamTrackFilterSchema.parse(raw);
  return filter === "all" ? null : filter;
}

/** Quiz sessions are single-track: concrete tracks only, absent = goal default. */
export function apiQuizTrack(req: Request, goalTrack: Track): Track {
  const raw = trackParam(req);
  if (raw === undefined) return goalTrack;
  return TrackSchema.parse(raw);
}
