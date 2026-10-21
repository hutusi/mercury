/**
 * Local drafts: in-progress learner work that has not reached the server yet
 * (an essay, a speaking transcript, picked answers) survives a reload, a tab
 * crash, or an accidental navigation. Pure helpers — the React binding is
 * use-draft.ts — so the format and expiry rules are unit-testable.
 *
 * Drafts are a convenience copy, never the source of truth: anything that
 * fails to parse or validate is treated as absent.
 */

/** Bump when a draft payload's shape changes; old entries then read as absent. */
const DRAFT_PREFIX = "mercury.draft.v1.";

export type DraftKind = "writing" | "speaking" | "reading" | "listening" | "book_quiz";

export function draftKey(kind: DraftKind, id: string): string {
  return `${DRAFT_PREFIX}${kind}.${id}`;
}

export function encodeDraft(value: unknown, now: number = Date.now()): string {
  return JSON.stringify({ at: now, value });
}

/** Parse a stored draft; null when missing, malformed, expired, or invalid. */
export function decodeDraft<T>(
  raw: string | null,
  validate: (value: unknown) => value is T,
  { maxAgeMs, now = Date.now() }: { maxAgeMs: number; now?: number },
): T | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { at, value } = parsed as { at?: unknown; value?: unknown };
  if (typeof at !== "number" || now - at > maxAgeMs || at > now + 60_000) return null;
  return validate(value) ? value : null;
}

/**
 * Every key holding a learner's unsent work in a storage area — drafts and
 * the exam answer mirror. Cleared on sign-out so the next person on a shared
 * device never sees (or submits) someone else's work.
 */
export function draftKeysIn(storage: Pick<Storage, "length" | "key">): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith("mercury.draft.") || key?.startsWith("mercury-exam-")) keys.push(key);
  }
  return keys;
}

/** Remove every learner draft from both storage areas (best effort). */
export function clearAllDrafts(): void {
  for (const area of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[area];
      for (const key of draftKeysIn(storage)) storage.removeItem(key);
    } catch {
      // Storage unavailable: nothing was saved there either.
    }
  }
}

/** A Record<string, number> of question id → chosen option index. */
export function isAnswerMap(value: unknown): value is Record<string, number> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => Number.isInteger(v) && v >= 0 && v <= 3)
  );
}

export const DAY_MS = 24 * 60 * 60 * 1000;
