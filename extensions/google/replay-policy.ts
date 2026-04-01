import type {
  AnyAgentTool,
  ProviderNormalizeToolSchemasContext,
  ProviderReasoningOutputMode,
  ProviderReplayPolicy,
} from "openclaw/plugin-sdk/plugin-entry";
import { cleanSchemaForGemini } from "openclaw/plugin-sdk/provider-tools";

const GOOGLE_REPLAY_POLICY = {
  sanitizeMode: "full",
  sanitizeToolCallIds: true,
  toolCallIdMode: "strict",
  sanitizeThoughtSignatures: {
    allowBase64Only: true,
    includeCamelCase: true,
  },
  applyAssistantFirstOrderingFix: true,
  allowSyntheticToolResults: true,
} as const satisfies ProviderReplayPolicy;

const GOOGLE_SCHEMA_NORMALIZATION_PROVIDERS = new Set(["google", "google-gemini-cli"]);

/** Returns the replay policy for Google-owned transports. */
export function buildGoogleReplayPolicy(): ProviderReplayPolicy {
  return GOOGLE_REPLAY_POLICY;
}

/** Rewrites tool schemas into Gemini's supported subset for Google transports. */
export function normalizeGoogleGeminiCliToolSchemas(
  ctx: ProviderNormalizeToolSchemasContext,
): AnyAgentTool[] | undefined {
  const provider = ctx.provider.trim().toLowerCase();
  if (!GOOGLE_SCHEMA_NORMALIZATION_PROVIDERS.has(provider)) {
    return undefined;
  }

  return ctx.tools.map((tool) => {
    if (!tool.parameters || typeof tool.parameters !== "object") {
      return tool;
    }
    return {
      ...tool,
      parameters: cleanSchemaForGemini(tool.parameters) as typeof tool.parameters,
    };
  });
}

/** Returns the reasoning output mode for Google-owned transports. */
export function resolveGoogleReasoningOutputMode(): ProviderReasoningOutputMode {
  return "tagged";
}
