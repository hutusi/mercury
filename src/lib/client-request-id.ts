export interface LogicalRequestId {
  fingerprint: string;
  requestId: string;
}

/** Keep one idempotency key while a client retries the same logical input. */
export function requestIdForInput(
  current: LogicalRequestId | null,
  fingerprint: string,
  createId: () => string = () => crypto.randomUUID(),
): LogicalRequestId {
  if (current?.fingerprint === fingerprint) return current;
  return { fingerprint, requestId: createId() };
}
