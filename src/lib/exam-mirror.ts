/**
 * The exam runner's refresh-safe localStorage mirror of picked answers.
 * Shared by the runner and the abandon control so an abandoned attempt never
 * leaves its answers behind on the device.
 */
export function examMirrorKey(attemptId: string): string {
  return `mercury-exam-${attemptId}`;
}

export function clearExamMirror(attemptId: string): void {
  try {
    localStorage.removeItem(examMirrorKey(attemptId));
  } catch {
    // Storage unavailable — nothing was mirrored there either.
  }
}

/** Backoff before the n-th (0-based) retry of a failed exam write. */
export function examRetryDelayMs(attempt: number): number {
  return Math.min(2_000 * 2 ** attempt, 15_000);
}
