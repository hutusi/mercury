/**
 * Client-side wait for a server-side job that another request owns. AI
 * grading is single-flight per request id: a resubmit that arrives while the
 * first call is still grading (a lost response, a double tap, a reload)
 * answers "in progress" instead of grading twice. Re-asking with the SAME
 * request id after a pause eventually returns the finished result, so the
 * learner sees their feedback instead of a dead-end error.
 *
 * Pure (sleep is injectable) so the loop is unit-testable.
 */
export async function retryWhileInProgress<T>(
  attempt: () => Promise<T>,
  isInProgress: (result: T) => boolean,
  {
    intervalMs = 4_000,
    // Comfortably past the server's 115 s AI route ceiling, so the owning
    // request has finished (or its lease has gone stale) before we give up.
    maxAttempts = 35,
    onWait,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  }: {
    intervalMs?: number;
    maxAttempts?: number;
    /** Called before each wait — e.g. to show "still grading". */
    onWait?: () => void;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<T> {
  let result = await attempt();
  for (let tries = 1; tries < maxAttempts && isInProgress(result); tries++) {
    onWait?.();
    await sleep(intervalMs);
    result = await attempt();
  }
  return result;
}
