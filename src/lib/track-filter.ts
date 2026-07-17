import { z } from "zod";
import { EXAM_TRACKS, TRACKS, type ExamTrack, type Track } from "../content/types";

/**
 * Per-feature track filtering (?track=…). The track is a content attribute,
 * not an app mode: an absent or invalid param defaults to the user's goal
 * track, and "all" lifts the filter entirely (null into the queries).
 */

export type TrackFilter = Track | "all";
export type ExamTrackFilter = ExamTrack | "all";

export const TrackFilterSchema = z.enum([...TRACKS, "all"]);
export const ExamTrackFilterSchema = z.enum([...EXAM_TRACKS, "all"]);

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
