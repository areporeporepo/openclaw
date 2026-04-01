import type {
  ProviderReplayPolicy,
  ProviderReplayPolicyContext,
} from "openclaw/plugin-sdk/plugin-entry";

const OPENAI_IMAGE_ONLY_REPLAY_POLICY = {
  sanitizeMode: "images-only",
} as const satisfies ProviderReplayPolicy;

const OPENAI_COMPLETIONS_REPLAY_POLICY = {
  sanitizeMode: "images-only",
  sanitizeToolCallIds: true,
  toolCallIdMode: "strict",
} as const satisfies ProviderReplayPolicy;

/** Returns the replay policy for OpenAI-owned transports. */
export function buildOpenAIReplayPolicy(ctx: ProviderReplayPolicyContext): ProviderReplayPolicy {
  return ctx.modelApi === "openai-completions"
    ? OPENAI_COMPLETIONS_REPLAY_POLICY
    : OPENAI_IMAGE_ONLY_REPLAY_POLICY;
}
