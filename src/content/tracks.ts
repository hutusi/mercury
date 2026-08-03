/**
 * Track constants, zod-free. Client components must import runtime values
 * from HERE, never from ./types — a value import of the schema module drags
 * the whole zod graph (~286 KB measured) into the route bundle. ./types
 * re-exports these, so server code and type-only imports are unaffected.
 */
export const TRACKS = ["toeic", "ielts", "business"] as const;
export type Track = (typeof TRACKS)[number];

export const EXAM_TRACKS = ["toeic", "ielts"] as const;
export type ExamTrack = (typeof EXAM_TRACKS)[number];
