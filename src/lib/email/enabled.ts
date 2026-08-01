// Transactional email is enabled by a single key (ADR 0027/0028):
// RESEND_API_KEY non-blank turns on the sign-up verification email, the
// password-reset flow, and the /link-social verification gate — verification
// is soft and never blocks sign-in. Unset (dev/CI/e2e/preview) leaves auth
// behaving exactly as before. The from-address has a sane prod default, so
// requiring a second var would only add a way to silently ship with the
// feature off.
export function isEmailEnabled(env: Record<string, string | undefined>): boolean {
  return Boolean(env.RESEND_API_KEY?.trim());
}

export const DEFAULT_EMAIL_FROM = "Mercury <noreply@mercury.ainaive.com>";

export function emailFrom(env: Record<string, string | undefined>): string {
  return env.MERCURY_EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
}
