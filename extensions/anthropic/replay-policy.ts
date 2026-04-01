import type {
  ProviderReplayPolicy,
  ProviderReplayPolicyContext,
} from "openclaw/plugin-sdk/plugin-entry";

const ANTHROPIC_REPLAY_POLICY = {
  sanitizeMode: "full",
  sanitizeToolCallIds: true,
  toolCallIdMode: "strict",
  preserveSignatures: true,
  allowSyntheticToolResults: true,
} as const satisfies ProviderReplayPolicy;

/** Returns the replay policy for Anthropic-owned transports. */
export function buildAnthropicReplayPolicy(
  _ctx: ProviderReplayPolicyContext,
): ProviderReplayPolicy {
  return ANTHROPIC_REPLAY_POLICY;
}
