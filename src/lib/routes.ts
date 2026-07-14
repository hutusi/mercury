/**
 * Paths that require an authenticated session. They appear locale-prefixed in
 * the URL (/zh/dashboard, /en/exams). Two consumers share this one list so the
 * auth gate and the crawler block can never drift apart:
 *   - src/proxy.ts redirects these to /login when the session cookie is absent.
 *   - src/app/robots.ts disallows them for crawlers.
 */
export const PROTECTED_PATHS = [
  "/dashboard",
  "/onboarding",
  "/vocabulary",
  "/reading",
  "/listening",
  "/writing",
  "/speaking",
  "/exams",
] as const;
