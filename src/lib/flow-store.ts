"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Session (flow) state shared between a runner and the FlowHeader above it:
 * the progress counter ("3 / 5") and how the exit button should behave.
 * A tiny module store read with useSyncExternalStore — the header is
 * rendered by the page, the runner deep inside it, and neither should
 * re-render the whole tree to talk.
 */

export type ExitPolicy = "saved" | "confirm" | "silent";

export interface FlowState {
  counter: string | null;
  /** "saved": leaving keeps progress (toast says so); "confirm": leaving loses work. */
  exit: ExitPolicy;
  /** Something unsent exists (only then does "saved" announce itself). */
  dirty: boolean;
}

const INITIAL: FlowState = { counter: null, exit: "silent", dirty: false };
let state: FlowState = INITIAL;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setFlowState(patch: Partial<FlowState>): void {
  const next = { ...state, ...patch };
  if (next.counter === state.counter && next.exit === state.exit && next.dirty === state.dirty) {
    return;
  }
  state = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFlowState(): FlowState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
}

/** A runner publishes its position ("3 / 5"); cleared when it unmounts. */
export function useFlowCounter(counter: string | null): void {
  useEffect(() => {
    setFlowState({ counter });
  }, [counter]);
  useEffect(() => () => setFlowState({ counter: null }), []);
}

/** A runner declares what leaving would cost; reset when it unmounts. */
export function useFlowExit(exit: ExitPolicy, dirty: boolean): void {
  useEffect(() => {
    setFlowState({ exit, dirty });
  }, [exit, dirty]);
  useEffect(() => () => setFlowState({ exit: "silent", dirty: false }), []);
}
