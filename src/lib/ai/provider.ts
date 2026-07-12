/**
 * AI provider selection. Pure env resolution — no SDK imports, no side
 * effects — so the routing rules stay unit-testable and DB-free.
 *
 * `MERCURY_AI_PROVIDER` picks a provider explicitly; when unset, the first
 * provider with a configured key wins (Anthropic before Bailian). A provider
 * without its key — including an explicit but misconfigured one, or an
 * unknown provider name — resolves to null, which callers surface as the
 * self-assessment degradation path rather than a hard failure.
 */
export type AiProvider = "anthropic" | "bailian";

const KEY_ENV: Record<AiProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  bailian: "DASHSCOPE_API_KEY",
};

const DEFAULT_MODEL: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-5",
  bailian: "glm-5.2",
};

export function resolveAiProvider(
  env: Record<string, string | undefined> = process.env,
): AiProvider | null {
  const explicit = env.MERCURY_AI_PROVIDER;
  if (explicit) {
    if (explicit !== "anthropic" && explicit !== "bailian") return null;
    return env[KEY_ENV[explicit]] ? explicit : null;
  }
  if (env[KEY_ENV.anthropic]) return "anthropic";
  if (env[KEY_ENV.bailian]) return "bailian";
  return null;
}

/**
 * The model id sent to (and persisted for) the given provider.
 * `MERCURY_AI_MODEL` overrides the per-provider default — it is provider
 * specific, so clear it when switching `MERCURY_AI_PROVIDER` or the wrong
 * model id gets sent to the other API.
 */
export function modelForProvider(
  provider: AiProvider,
  env: Record<string, string | undefined> = process.env,
): string {
  return env.MERCURY_AI_MODEL || DEFAULT_MODEL[provider];
}
