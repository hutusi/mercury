// Transactional email is enabled by a single key (ADR 0027): RESEND_API_KEY
// non-blank turns on verification enforcement, password reset, and the email
// sender; unset (dev/CI/e2e/preview) leaves auth behaving exactly as before.
// The from-address has a sane prod default, so requiring a second var would
// only add a way to silently ship with the feature off.
export function isEmailEnabled(env: Record<string, string | undefined>): boolean {
  return Boolean(env.RESEND_API_KEY?.trim());
}

export const DEFAULT_EMAIL_FROM = "Mercury <noreply@mercury.ainaive.com>";

export function emailFrom(env: Record<string, string | undefined>): string {
  return env.MERCURY_EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
}
