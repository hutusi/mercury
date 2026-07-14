/**
 * The single source of truth for the origin the app is served from.
 *
 * Production sets BETTER_AUTH_URL to the real domain (takes precedence).
 * Preview deployments have a per-deploy URL, so fall back to VERCEL_URL; local
 * dev falls back to localhost. This is the same chain `src/lib/auth/auth.ts`
 * relies on to keep better-auth's origin matching the request — reused here so
 * `metadataBase`, robots, sitemap, and the manifest all agree with auth (and so
 * `metadataBase` no longer silently degrades to localhost on preview deploys,
 * which shipped Open Graph URLs pointing at the wrong host).
 *
 * Server-only: VERCEL_URL is a build/runtime env var, never exposed to the
 * client. Every consumer (generateMetadata, route handlers) runs server-side.
 */
export function siteBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/** The base URL as a `URL`, for `metadataBase` and for building absolute links. */
export function siteUrl(): URL {
  return new URL(siteBaseUrl());
}
