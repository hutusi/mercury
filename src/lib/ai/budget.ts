/**
 * Wall-clock budget for runtime AI calls. Pure constants (no SDK imports) so
 * the invariant against the claim stale windows is unit-testable.
 *
 * Grading and chat claim a single-flight lease before calling the provider
 * and treat a lease older than its stale window as abandoned (a dead function
 * can't strand the learner). If the provider call could outlive that window,
 * a client retry would reclaim the lease — charging quota again — while the
 * original request was still running, which then failed with
 * grading_claim_superseded. Every runtime call therefore runs under an
 * overall deadline that ends well inside the window.
 */

/** Per-attempt provider timeout (each SDK attempt, each Bailian round-trip). */
export const AI_ATTEMPT_TIMEOUT_MS = 60_000;

/** SDK-level retries after a failed attempt (transient 5xx/429/network). */
export const AI_MAX_RETRIES = 1;

/**
 * Hard ceiling for one runtime facade call — retries and the Bailian repair
 * round-trip included. A later attempt only gets what the deadline leaves.
 */
export const AI_CALL_BUDGET_MS = 100_000;

/**
 * `maxDuration` (seconds) for every route that makes a runtime AI call: the
 * call budget plus headroom for the claim and publish transactions. Route
 * segment config must be a literal, so the routes repeat this number and
 * budget.test.ts checks they agree.
 */
export const AI_ROUTE_MAX_DURATION_S = 115;

/**
 * Authoring-time scripts (scripts/generate-book-questions.ts) draft whole
 * chapters and are not bound by any lease, so they get a longer ceiling.
 */
export const AI_AUTHORING_BUDGET_MS = 10 * 60_000;
