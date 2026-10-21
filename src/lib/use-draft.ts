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
 *   A write still waiting on the debounce lands immediately when saving is
 *   paused (`enabled` turns false, e.g. on submit), the key changes, the
 *   component unmounts, or the page is hidden — never dropped.
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
  // The value last scheduled for storage. Seeded with the mount value, which
  // is never written: it would overwrite the stored draft before the restore
  // below has handed it over.
  const savedValueRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWriteRef = useRef<(() => void) | null>(null);
  // Latest-ref: the restore callback is read once, from the mount effect.
  const onRestoreRef = useRef(onRestore);
  const validateRef = useRef(validate);
  useEffect(() => {
    onRestoreRef.current = onRestore;
    validateRef.current = validate;
  });

  useEffect(() => {
    const storage = storageFor(area);
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

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const write = pendingWriteRef.current;
    pendingWriteRef.current = null;
    write?.();
  }, []);

  useEffect(() => {
    if (!enabled || Object.is(value, savedValueRef.current)) return;
    savedValueRef.current = value;
    pendingWriteRef.current = () => {
      const storage = storageFor(area);
      if (!storage) return;
      try {
        if (isEmpty(value)) storage.removeItem(key);
        else storage.setItem(key, encodeDraft(value));
      } catch {
        // Quota exceeded or storage disabled: the draft just isn't kept.
      }
    };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, debounceMs);
  }, [key, area, value, enabled, isEmpty, debounceMs, flush]);

  useEffect(() => {
    if (!enabled) flush();
  }, [enabled, flush]);

  useEffect(() => {
    // pagehide also covers a reload or tab close the beforeunload guard let
    // through; the cleanup covers unmount and a key change (old key's write).
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [key, area, flush]);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingWriteRef.current = null;
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
