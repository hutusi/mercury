"use client";

import { useCallback, useEffect, useRef } from "react";
import { decodeDraft, encodeDraft } from "./drafts";

type Area = "local" | "session";

function storageFor(area: Area): Storage | null {
  // Private modes, disabled site data, and quota errors all throw here or on
  // write; drafts are a convenience copy, so every failure degrades silently.
  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Keep a local copy of unsent learner work (see drafts.ts).
 *
 * - On mount, a valid stored draft is handed to `onRestore` exactly once.
 * - Afterwards `value` is saved (debounced) whenever it changes while
 *   `enabled`; an `isEmpty` value removes the draft instead of storing it.
 * - `clear()` drops the draft — call it once the server has the work.
 *
 * Restore happens in an effect (not a lazy initializer) so the server render
 * and the first client render agree; the component swaps in the draft right
 * after hydration.
 */
export function useDraft<T>({
  key,
  value,
  enabled = true,
  area = "local",
  maxAgeMs,
  validate,
  isEmpty,
  onRestore,
  debounceMs = 400,
}: {
  key: string;
  value: T;
  enabled?: boolean;
  area?: Area;
  maxAgeMs: number;
  validate: (value: unknown) => value is T;
  isEmpty: (value: T) => boolean;
  onRestore: (value: T) => void;
  debounceMs?: number;
}): { clear: () => void } {
  const restoredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest-ref: the restore callback is read once, from the mount effect.
  const onRestoreRef = useRef(onRestore);
  const validateRef = useRef(validate);
  useEffect(() => {
    onRestoreRef.current = onRestore;
    validateRef.current = validate;
  });

  useEffect(() => {
    const storage = storageFor(area);
    restoredRef.current = true;
    if (!storage) return;
    let raw: string | null = null;
    try {
      raw = storage.getItem(key);
    } catch {
      return;
    }
    const draft = decodeDraft(raw, validateRef.current, { maxAgeMs });
    if (draft !== null) onRestoreRef.current(draft);
    else if (raw !== null) {
      try {
        storage.removeItem(key);
      } catch {
        // ignore — see storageFor
      }
    }
  }, [key, area, maxAgeMs]);

  useEffect(() => {
    // Never overwrite the stored draft with the initial value before the
    // restore effect has looked at it.
    if (!enabled || !restoredRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const storage = storageFor(area);
      if (!storage) return;
      try {
        if (isEmpty(value)) storage.removeItem(key);
        else storage.setItem(key, encodeDraft(value));
      } catch {
        // Quota exceeded or storage disabled: the draft just isn't kept.
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, area, value, enabled, isEmpty, debounceMs]);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const storage = storageFor(area);
    try {
      storage?.removeItem(key);
    } catch {
      // ignore — see storageFor
    }
  }, [key, area]);

  return { clear };
}

/** Ask before unloading the page while `when` holds (e.g. mid-recording). */
export function useBeforeUnloadGuard(when: boolean): void {
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);
}
