import type {
  ChannelDoctorConfigMutation,
  ChannelDoctorLegacyConfigRule,
} from "openclaw/plugin-sdk/channel-contract";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
import {
  normalizeLegacyDmAliases,
  normalizeLegacyStreamingAliases,
} from "openclaw/plugin-sdk/runtime-doctor";
import { resolveSlackNativeStreaming, resolveSlackStreamingMode } from "./streaming-compat.js";

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// Inlined to keep `legacyConfigRules` evaluation on the bundled `contract-api.js`
// self-contained. Reaching into `openclaw/plugin-sdk/runtime-doctor` at doctor
// contract load time has regressed multiple releases (see fix: bypass stale
// helper runtime exports). The checks below are small and behavior-identical
// to `hasLegacyStreamingAliases`/`hasLegacyAccountStreamingAliases` in
// `src/config/channel-compat-normalization.ts`.
function hasLegacySlackStreamingAliases(value: unknown): boolean {
  const entry = asObjectRecord(value);
  if (!entry) {
    return false;
  }
  return (
    entry.streamMode !== undefined ||
    typeof entry.streaming === "boolean" ||
    typeof entry.streaming === "string" ||
    entry.chunkMode !== undefined ||
    entry.blockStreaming !== undefined ||
    entry.blockStreamingCoalesce !== undefined ||
    entry.nativeStreaming !== undefined
  );
}

function hasLegacySlackAccountStreamingAliases(value: unknown): boolean {
  const accounts = asObjectRecord(value);
  if (!accounts) {
    return false;
  }
  return Object.values(accounts).some((account) => hasLegacySlackStreamingAliases(account));
}

export const legacyConfigRules: ChannelDoctorLegacyConfigRule[] = [
  {
    path: ["channels", "slack"],
    message:
      "channels.slack.streamMode, channels.slack.streaming (scalar), chunkMode, blockStreaming, blockStreamingCoalesce, and nativeStreaming are legacy; use channels.slack.streaming.{mode,chunkMode,block.enabled,block.coalesce,nativeTransport}.",
    match: hasLegacySlackStreamingAliases,
  },
  {
    path: ["channels", "slack", "accounts"],
    message:
      "channels.slack.accounts.<id>.streamMode, streaming (scalar), chunkMode, blockStreaming, blockStreamingCoalesce, and nativeStreaming are legacy; use channels.slack.accounts.<id>.streaming.{mode,chunkMode,block.enabled,block.coalesce,nativeTransport}.",
    match: hasLegacySlackAccountStreamingAliases,
  },
];

export function normalizeCompatibilityConfig({
  cfg,
}: {
  cfg: OpenClawConfig;
}): ChannelDoctorConfigMutation {
  const rawEntry = asObjectRecord((cfg.channels as Record<string, unknown> | undefined)?.slack);
  if (!rawEntry) {
    return { config: cfg, changes: [] };
  }

  const changes: string[] = [];
  let updated = rawEntry;
  let changed = false;

  const dm = normalizeLegacyDmAliases({
    entry: updated,
    pathPrefix: "channels.slack",
    changes,
  });
  updated = dm.entry;
  changed = changed || dm.changed;

  const streaming = normalizeLegacyStreamingAliases({
    entry: updated,
    pathPrefix: "channels.slack",
    changes,
    resolvedMode: resolveSlackStreamingMode(updated),
    resolvedNativeTransport: resolveSlackNativeStreaming(updated),
  });
  updated = streaming.entry;
  changed = changed || streaming.changed;

  const rawAccounts = asObjectRecord(updated.accounts);
  if (rawAccounts) {
    let accountsChanged = false;
    const accounts = { ...rawAccounts };
    for (const [accountId, rawAccount] of Object.entries(rawAccounts)) {
      const account = asObjectRecord(rawAccount);
      if (!account) {
        continue;
      }
      let accountEntry = account;
      let accountChanged = false;
      const accountDm = normalizeLegacyDmAliases({
        entry: accountEntry,
        pathPrefix: `channels.slack.accounts.${accountId}`,
        changes,
      });
      accountEntry = accountDm.entry;
      accountChanged = accountDm.changed;
      const accountStreaming = normalizeLegacyStreamingAliases({
        entry: accountEntry,
        pathPrefix: `channels.slack.accounts.${accountId}`,
        changes,
        resolvedMode: resolveSlackStreamingMode(accountEntry),
        resolvedNativeTransport: resolveSlackNativeStreaming(accountEntry),
      });
      accountEntry = accountStreaming.entry;
      accountChanged = accountChanged || accountStreaming.changed;
      if (accountChanged) {
        accounts[accountId] = accountEntry;
        accountsChanged = true;
      }
    }
    if (accountsChanged) {
      updated = { ...updated, accounts };
      changed = true;
    }
  }

  if (!changed) {
    return { config: cfg, changes: [] };
  }
  return {
    config: {
      ...cfg,
      channels: {
        ...cfg.channels,
        slack: updated as unknown as NonNullable<OpenClawConfig["channels"]>["slack"],
      } as OpenClawConfig["channels"],
    },
    changes,
  };
}
