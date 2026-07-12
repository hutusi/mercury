# ADR 0011: Multi-provider AI (Claude + Bailian GLM)

**Status:** Accepted (2026-07)

## Context

AI grading was Anthropic-only ([ADR 0006](0006-ai-structured-output-and-degradation.md)). For a China-facing product that is a fragile single dependency: the Anthropic API is not reachable from the mainland network, and cost/latency argue for a domestic alternative. Alibaba Cloud Model Studio (Bailian) hosts GLM-5.2 with structured output and function calling, exposed over OpenAI-compatible, DashScope-native, and Anthropic-compatible interfaces.

## Decision

- **Provider abstraction behind the existing facade.** `src/lib/ai/client.ts` keeps its public surface (`isAiEnabled`, `getWritingFeedback`, `getSpeakingFeedback`, `AiUnavailableError`, plus new `activeAiModel`); transports live in `anthropic.ts` / `bailian.ts`, selected by pure env resolution in `provider.ts`. Services and routes never know which provider ran.
- **Selection**: `MERCURY_AI_PROVIDER=anthropic|bailian` explicit, else auto-detect by configured key (`ANTHROPIC_API_KEY` before `DASHSCOPE_API_KEY`). A misconfigured provider (unknown name, missing key) resolves to _disabled_, which is the existing self-assessment degradation path — configuration mistakes degrade, they don't crash.
- **Bailian goes through the OpenAI-compatible endpoint** (`https://dashscope.aliyuncs.com/compatible-mode/v1`, `openai` SDK with `baseURL`), _not_ Bailian's Anthropic-compatible endpoint: the latter speaks legacy thinking params (`budget_tokens`) and does not support the `output_config` structured-output surface that `messages.parse` + `zodOutputFormat` relies on.
- **Schema enforcement differs per provider.** Anthropic stays server-enforced (unchanged from ADR 0006). GLM has no schema-enforced mode, so the Bailian transport requests `response_format: {type: "json_object"}` with **thinking disabled** (`enable_thinking: false` — GLM structured output only works in non-thinking mode), embeds the zod-derived JSON Schema (`z.toJSONSchema`) in the system prompt, validates the reply with `safeParse`, and attempts **one repair round-trip** (replay the reply + validation problems) before raising `AiUnavailableError`.
- **The degradation contract is provider-independent**: every transport failure — key missing, HTTP error, refusal, truncation, schema mismatch after repair — surfaces as `AiUnavailableError`, so `self_assessed` + model answer + checklist behave exactly as before.
- `MERCURY_AI_MODEL` overrides the per-provider default (`claude-sonnet-5` / `glm-5.2`). It is provider-specific: a stale Claude model id with `MERCURY_AI_PROVIDER=bailian` would be sent verbatim to DashScope and fail (degrading, per the above).

## Consequences

- Vercel/dev config is per-environment: set `DASHSCOPE_API_KEY` (+ optionally `MERCURY_AI_PROVIDER`, `DASHSCOPE_BASE_URL` for the intl endpoint) to grade with GLM; keyless dev/CI keeps running the degradation path — e2e forces it by blanking both keys.
- The persisted `model` column now reflects whichever provider graded a submission (`activeAiModel()`), so historical rows stay attributable.
- The prompt-embedded-schema path is weaker than server enforcement; the repair retry bounds the extra cost to one call, and failures land in the same degradation UX users already understand.
- Adding a third provider is now a transport file + two entries in `provider.ts`.
