/**
 * SM-2 spaced repetition with a four-button grade scale.
 * Deterministic and dependency-free so it can be unit tested directly.
 */

export type ReviewGrade = 1 | 3 | 4 | 5; // Again / Hard / Good / Easy

export interface SrsState {
  easeFactor: number; // starts at 2.5, floored at 1.3
  intervalDays: number; // 0 while learning
  repetitions: number; // consecutive successful reviews
  lapses: number;
}

export const NEW_CARD_STATE: SrsState = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
  lapses: 0,
};

const MIN_EASE = 1.3;
const AGAIN_DELAY_MS = 10 * 60 * 1000; // failed cards come back in 10 minutes
const DAY_MS = 24 * 60 * 60 * 1000;

export interface IntervalPreview {
  unit: "minutes" | "days";
  value: number;
}

/** What pressing `grade` right now would schedule — hint labels under rating buttons. */
export function previewInterval(state: SrsState, grade: ReviewGrade): IntervalPreview {
  if (grade < 3) return { unit: "minutes", value: AGAIN_DELAY_MS / 60_000 };
  return { unit: "days", value: scheduleReview(state, grade).intervalDays };
}

export function scheduleReview(
  state: SrsState,
  grade: ReviewGrade,
  now: Date = new Date(),
): SrsState & { dueAt: Date } {
  // SM-2 ease update: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  const q = grade;
  const easeFactor = Math.max(
    MIN_EASE,
    state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  if (grade < 3) {
    // Lapse: back to learning, due again within the same session.
    return {
      easeFactor,
      intervalDays: 0,
      repetitions: 0,
      lapses: state.lapses + 1,
      dueAt: new Date(now.getTime() + AGAIN_DELAY_MS),
    };
  }

  const repetitions = state.repetitions + 1;
  let intervalDays: number;
  if (repetitions === 1) {
    intervalDays = 1;
  } else if (repetitions === 2) {
    intervalDays = 6;
  } else {
    intervalDays = Math.round(state.intervalDays * easeFactor);
  }
  // "Hard" shouldn't grow the interval as fast; "Easy" gets a small bonus day.
  if (grade === 3 && repetitions > 2) {
    intervalDays = Math.max(1, Math.round(state.intervalDays * 1.2));
  }
  if (grade === 5 && repetitions > 2) {
    intervalDays += 1;
  }

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses: state.lapses,
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
  };
}
