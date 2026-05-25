import { createFixtureCardCatalog, type CardCatalog } from "@/domain/cards/card-catalog";
import { createScryfallCardCatalog } from "@/domain/cards/scryfall-catalog";
import { createScryfallClient } from "@/domain/cards/scryfall-client";
import { fixtureCards } from "@/domain/decks/demo-fixtures";
import { createFixtureEdhrecProvider, createLiveEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import type { EdhrecProvider } from "@/domain/edhrec/edhrec-types";
import { createFileCache, type ProviderCache } from "@/domain/shared/cache";
import { createRateLimiter } from "@/domain/shared/rate-limit";
import { err, ok, type Result } from "@/domain/shared/result";

export type ProviderMode = "fixture" | "live";
export type RuntimeEdhrecMode = ProviderMode | "fixture-fallback";

export type RuntimeProviderMode = {
  scryfall: ProviderMode;
  edhrec: RuntimeEdhrecMode;
};

export type RuntimeProviders = {
  catalog: CardCatalog;
  fixtureCatalog: CardCatalog;
  edhrec: EdhrecProvider;
  fixtureEdhrec: EdhrecProvider;
  mode: RuntimeProviderMode;
  warnings: string[];
};

export type RuntimeProviderOverrides = {
  fetchImpl?: typeof fetch;
  cache?: ProviderCache;
};

const defaultCacheDir = ".deckroot-cache";
const liveModes = new Set(["fixture", "live"]);
const placeholderUserAgentPatterns = [
  /example\.(com|net|org)/i,
  /contact@example/i,
  /you@example/i,
  /your-email@example/i,
  /placeholder/i,
  /change-?me/i,
];

function parseProviderMode(value: string | undefined, envName: string): Result<ProviderMode> {
  const mode = (value ?? "fixture").trim().toLowerCase();
  if (liveModes.has(mode)) return ok(mode as ProviderMode);
  return err("PROVIDER_ERROR", `${envName} must be either fixture or live.`, { envName, value });
}

function validateUserAgent(userAgent: string | undefined, purpose: string): Result<string> {
  const trimmed = userAgent?.trim() ?? "";
  if (!trimmed) return err("PROVIDER_ERROR", `DECKROOT_USER_AGENT must be set before enabling ${purpose}.`);
  if (placeholderUserAgentPatterns.some((pattern) => pattern.test(trimmed))) {
    return err("PROVIDER_ERROR", "DECKROOT_USER_AGENT must include a real app/contact value, not a placeholder example address.");
  }
  return ok(trimmed);
}

export function createRuntimeProviders(
  env: NodeJS.ProcessEnv = process.env,
  overrides: RuntimeProviderOverrides = {},
): Result<RuntimeProviders> {
  const scryfallMode = parseProviderMode(env.DECKROOT_SCRYFALL_MODE, "DECKROOT_SCRYFALL_MODE");
  if (!scryfallMode.ok) return scryfallMode;

  const edhrecMode = parseProviderMode(env.DECKROOT_EDHREC_MODE, "DECKROOT_EDHREC_MODE");
  if (!edhrecMode.ok) return edhrecMode;

  const warnings: string[] = [];
  const cache = overrides.cache ?? createFileCache(env.DECKROOT_CACHE_DIR?.trim() || defaultCacheDir);
  const fixtureCatalog = createFixtureCardCatalog();
  const fixtureEdhrec = createFixtureEdhrecProvider(fixtureCatalog);

  let catalog: CardCatalog = fixtureCatalog;
  if (scryfallMode.value === "live") {
    const userAgent = validateUserAgent(env.DECKROOT_USER_AGENT, "live Scryfall mode");
    if (!userAgent.ok) return userAgent;
    const client = createScryfallClient({
      cache,
      limiter: createRateLimiter({ intervalMs: 200, maxConcurrent: 1 }),
      userAgent: userAgent.value,
      fetchImpl: overrides.fetchImpl,
    });
    catalog = createScryfallCardCatalog({ client, fallbackCards: fixtureCards });
  }

  let edhrec: EdhrecProvider = fixtureEdhrec;
  let runtimeEdhrecMode: RuntimeEdhrecMode = "fixture";
  if (edhrecMode.value === "live") {
    if (env.DECKROOT_EDHREC_LIVE_ACK !== "true") {
      runtimeEdhrecMode = "fixture-fallback";
      warnings.push("EDHREC live mode was requested, but DECKROOT_EDHREC_LIVE_ACK is not true; using fixture recommendations.");
    } else {
      const userAgent = validateUserAgent(env.DECKROOT_USER_AGENT, "live EDHREC mode");
      if (!userAgent.ok) return userAgent;
      runtimeEdhrecMode = "live";
      edhrec = createLiveEdhrecProvider({
        catalog,
        cache,
        limiter: createRateLimiter({ intervalMs: 1000, maxConcurrent: 1 }),
        userAgent: userAgent.value,
        fetchImpl: overrides.fetchImpl,
      });
    }
  }

  return ok({
    catalog,
    fixtureCatalog,
    edhrec,
    fixtureEdhrec,
    mode: { scryfall: scryfallMode.value, edhrec: runtimeEdhrecMode },
    warnings,
  });
}
