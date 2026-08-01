export const SOCIAL_PROVIDER_IDS = ["google", "github"] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number];

const ENV_KEYS: Record<SocialProviderId, [string, string]> = {
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
};

// A provider is enabled only when BOTH its env vars are non-blank. Empty and
// whitespace-only strings count as unset: playwright.config.ts blanks the vars
// with "" so the keyless e2e server wins over real credentials in the
// developer's .env (Next never overrides pre-set env), and a stray space pasted
// into an env UI must not surface a button backed by garbage credentials.
// Feeds both the better-auth server config and the (auth) layout's button list
// so the two can't drift.
export function enabledSocialProviders(
  env: Record<string, string | undefined>,
): SocialProviderId[] {
  return SOCIAL_PROVIDER_IDS.filter((id) => ENV_KEYS[id].every((key) => env[key]?.trim()));
}
