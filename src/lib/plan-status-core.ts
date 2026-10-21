import type { PlanItem, PlanItemKind } from "./plan-core";

/**
 * Pure status derivation for the persistent daily route (ADR 0033). A day's
 * plan is a frozen snapshot of PlanItems; whether each stop is done, started,
 * skipped, or still ahead is derived from that learner-day's facts (reviews,
 * attempts, clears, submissions) rather than stored, so it can never drift
 * from what actually happened. DB-free so every rule is unit-tested.
 */

export type StopStatus = "done" | "current" | "open" | "skipped";

export type StopProgress =
  | { type: "count"; done: number; target: number }
  | { type: "score"; score: number; total: number }
  | { type: "exam"; section: number; sections: number };

export interface PlanStop extends PlanItem {
  /** Stable identity within a day: `${kind}:${refId}`. */
  key: string;
  status: StopStatus;
  progress: StopProgress | null;
  /** Begun but not finished (a partial count, an exam in progress). */
  started: boolean;
}

export interface PlanFacts {
  /** Distinct cards reviewed today that existed before today. */
  vocabReviewedExisting: number;
  /** Distinct cards first created (seen) today. */
  vocabReviewedNew: number;
  /** Mistakes whose current generation was cleared today. */
  mistakesClearedToday: number;
  /** Latest attempt today per `${kind}:${refId}` (reading/listening). */
  exercises: ReadonlyMap<string, { score: number; total: number }>;
  /** Prompt ids with a submission today. */
  writingSubmitted: ReadonlySet<string>;
  speakingSubmitted: ReadonlySet<string>;
  /** Latest quiz attempt today per chapter id. */
  bookQuizzes: ReadonlyMap<string, { score: number; total: number }>;
  /** Exam id → completed today, or in progress (with its section position). */
  exams: ReadonlyMap<
    string,
    { status: "completed" | "in_progress"; section: number; sections: number }
  >;
}

export const EMPTY_FACTS: PlanFacts = {
  vocabReviewedExisting: 0,
  vocabReviewedNew: 0,
  mistakesClearedToday: 0,
  exercises: new Map(),
  writingSubmitted: new Set(),
  speakingSubmitted: new Set(),
  bookQuizzes: new Map(),
  exams: new Map(),
};

export function planItemKey(item: Pick<PlanItem, "kind" | "refId">): string {
  return `${item.kind}:${item.refId ?? ""}`;
}

function countProgress(done: number, target: number | undefined): StopProgress {
  const goal = Math.max(1, target ?? 1);
  return { type: "count", done: Math.min(done, goal), target: goal };
}

/** done + progress for one item from the day's facts. */
function evaluate(
  item: PlanItem,
  facts: PlanFacts,
): { done: boolean; progress: StopProgress | null; started: boolean } {
  switch (item.kind) {
    case "vocab_review":
    case "vocab_new": {
      const count =
        item.kind === "vocab_review" ? facts.vocabReviewedExisting : facts.vocabReviewedNew;
      const progress = countProgress(count, item.target);
      const done = progress.type === "count" && progress.done >= progress.target;
      return { done, progress: count > 0 ? progress : null, started: count > 0 && !done };
    }
    case "mistakes": {
      const count = facts.mistakesClearedToday;
      const progress = countProgress(count, item.target);
      const done = progress.type === "count" && progress.done >= progress.target;
      return { done, progress, started: count > 0 && !done };
    }
    case "reading":
    case "listening": {
      const attempt = facts.exercises.get(`${item.kind}:${item.refId}`);
      return attempt
        ? { done: true, progress: { type: "score", ...attempt }, started: false }
        : { done: false, progress: null, started: false };
    }
    case "writing":
      return { done: facts.writingSubmitted.has(item.refId ?? ""), progress: null, started: false };
    case "speaking":
      return {
        done: facts.speakingSubmitted.has(item.refId ?? ""),
        progress: null,
        started: false,
      };
    case "book_chapter": {
      const attempt = facts.bookQuizzes.get(item.refId ?? "");
      return attempt
        ? { done: true, progress: { type: "score", ...attempt }, started: false }
        : { done: false, progress: null, started: false };
    }
    case "mock_exam": {
      const exam = facts.exams.get(item.refId ?? "");
      if (!exam) return { done: false, progress: null, started: false };
      if (exam.status === "completed") return { done: true, progress: null, started: false };
      return {
        done: false,
        progress: { type: "exam", section: exam.section + 1, sections: exam.sections },
        started: true,
      };
    }
  }
}

/**
 * Stops in plan order. Precedence: done > skipped > current/open — finishing
 * a skipped stop counts. "Current" is the first stop that is neither done nor
 * skipped: the one raised card with a primary action.
 */
export function derivePlanStops(
  items: readonly PlanItem[],
  facts: PlanFacts,
  skipped: ReadonlySet<string>,
): PlanStop[] {
  let currentAssigned = false;
  return items.map((item) => {
    const key = planItemKey(item);
    const { done, progress, started } = evaluate(item, facts);
    let status: StopStatus;
    if (done) status = "done";
    else if (skipped.has(key)) status = "skipped";
    else if (!currentAssigned) {
      status = "current";
      currentAssigned = true;
    } else status = "open";
    return { ...item, key, status, progress, started };
  });
}

export interface RouteSummary {
  done: number;
  /** Stops still counted toward the day (skipped ones are not). */
  total: number;
  currentKey: string | null;
  /** Every stop done or skipped, with at least one done. */
  allDone: boolean;
  remainingMinutes: number;
  totalMinutes: number;
}

export function summarizeRoute(stops: readonly PlanStop[]): RouteSummary {
  const counted = stops.filter((s) => s.status !== "skipped");
  const done = counted.filter((s) => s.status === "done").length;
  const remaining = stops.filter((s) => s.status === "current" || s.status === "open");
  return {
    done,
    total: counted.length,
    currentKey: stops.find((s) => s.status === "current")?.key ?? null,
    allDone: remaining.length === 0 && done > 0,
    remainingMinutes: remaining.reduce((sum, s) => sum + s.estMinutes, 0),
    totalMinutes: stops.reduce((sum, s) => sum + s.estMinutes, 0),
  };
}

/** What a session page is, for finding its stop in today's route. */
export type StopMatch =
  | { kind: "vocab" }
  | { kind: "mistakes" }
  | {
      kind: Exclude<PlanItemKind, "vocab_review" | "vocab_new" | "mistakes">;
      refId: string;
    };

function matches(stop: PlanStop, match: StopMatch): boolean {
  if (match.kind === "vocab") return stop.kind === "vocab_review" || stop.kind === "vocab_new";
  if (match.kind === "mistakes") return stop.kind === "mistakes";
  return stop.kind === match.kind && stop.refId === match.refId;
}

/**
 * Locate a session in today's route: its 0-based index and the stop to send
 * the learner to next — the first unfinished stop after it, else the first
 * unfinished one before it, else none (the day is done).
 */
export function locateStop(
  stops: readonly PlanStop[],
  match: StopMatch,
): { index: number; stop: PlanStop; next: PlanStop | null } | null {
  const index = stops.findIndex((s) => matches(s, match));
  if (index < 0) return null;
  const unfinished = (s: PlanStop, i: number) =>
    i !== index && (s.status === "current" || s.status === "open");
  const next =
    stops.find((s, i) => i > index && unfinished(s, i)) ??
    stops.find((s, i) => i < index && unfinished(s, i)) ??
    null;
  return { index, stop: stops[index], next };
}

/**
 * Regenerate a stale plan (the learner changed their goal mid-day) without
 * rewriting history: stops already done, skipped, or begun keep their place;
 * fresh items fill the rest, never duplicating a kept stop, up to `max`.
 */
export function mergeRegeneratedItems(
  previous: readonly PlanStop[],
  fresh: readonly PlanItem[],
  max = 5,
): PlanItem[] {
  const kept = previous.filter((s) => s.status === "done" || s.status === "skipped" || s.started);
  const keptKeys = new Set(kept.map((s) => s.key));
  const merged: PlanItem[] = kept.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip derived fields
    ({ key, status, progress, started, ...item }) => item,
  );
  for (const item of fresh) {
    if (merged.length >= max) break;
    if (keptKeys.has(planItemKey(item))) continue;
    merged.push(item);
  }
  return merged;
}

/** Which facts a plan needs, so the fact queries run only what matters. */
export function factNeeds(items: readonly PlanItem[]): {
  vocab: boolean;
  mistakes: boolean;
  exercises: { kind: "reading" | "listening"; refId: string }[];
  writing: string[];
  speaking: string[];
  books: { bookId: string; chapterId: string }[];
  exams: string[];
} {
  const needs = {
    vocab: false,
    mistakes: false,
    exercises: [] as { kind: "reading" | "listening"; refId: string }[],
    writing: [] as string[],
    speaking: [] as string[],
    books: [] as { bookId: string; chapterId: string }[],
    exams: [] as string[],
  };
  for (const item of items) {
    if (item.kind === "vocab_review" || item.kind === "vocab_new") needs.vocab = true;
    else if (item.kind === "mistakes") needs.mistakes = true;
    else if ((item.kind === "reading" || item.kind === "listening") && item.refId) {
      needs.exercises.push({ kind: item.kind, refId: item.refId });
    } else if (item.kind === "writing" && item.refId) needs.writing.push(item.refId);
    else if (item.kind === "speaking" && item.refId) needs.speaking.push(item.refId);
    else if (item.kind === "book_chapter" && item.refId && item.bookId) {
      needs.books.push({ bookId: item.bookId, chapterId: item.refId });
    } else if (item.kind === "mock_exam" && item.refId) needs.exams.push(item.refId);
  }
  return needs;
}
