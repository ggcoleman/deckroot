import { normalize, type CardCatalog } from "@/domain/cards/card-catalog";
import type { ProviderCache } from "@/domain/shared/cache";
import type { RateLimiter } from "@/domain/shared/rate-limit";
import type { EdhrecProvider, EdhrecRecommendationRequest, EdhrecRecommendationResponse, EdhrecRecommendedCard } from "@/domain/edhrec/edhrec-types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const attributionBaseUrl = "https://edhrec.com/commanders";

const fixtureRecommendationNames = [
  "Sol Ring",
  "Arcane Signet",
  "Command Tower",
  "Bitterblossom",
  "Reconnaissance Mission",
  "Favorable Winds",
  "Anointed Procession",
  "Swords to Plowshares",
  "Counterspell",
  "Phyrexian Arena",
  "Damn",
  "Azorius Signet",
  "Orzhov Signet",
  "Dimir Signet",
];

type FetchImpl = typeof fetch;

type LiveEdhrecOptions = {
  catalog: CardCatalog;
  cache: ProviderCache;
  limiter: RateLimiter;
  userAgent: string;
  fetchImpl?: FetchImpl;
};

type LiveEdhrecCard = {
  name?: string;
  card?: string | { name?: string };
  score?: number;
  synergyScore?: number;
  synergy?: number;
  inclusionRate?: number | null;
  inclusion?: number | null;
  reason?: string;
};

type LiveEdhrecPayload = {
  inRecs?: LiveEdhrecCard[];
  cards?: LiveEdhrecCard[];
};

const slugifyCommander = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const attributionUrl = (commanderName: string) => `${attributionBaseUrl}/${slugifyCommander(commanderName)}`;

const cleanNames = (names: Array<string | undefined>) => names.map((name) => name?.trim()).filter((name): name is string => Boolean(name));

const normalizedUniqueNames = (names: Array<string | undefined>) => {
  const values = new Set<string>();
  for (const name of cleanNames(names)) values.add(normalize(name));
  return [...values].sort();
};

const displayUniqueNames = (names: Array<string | undefined>) => {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const name of cleanNames(names)) {
    const key = normalize(name);
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(name);
  }
  return values;
};

const cacheKeyFor = (request: EdhrecRecommendationRequest) => JSON.stringify({
  commanders: normalizedUniqueNames([request.commanderName, request.partnerName]),
  cards: normalizedUniqueNames(request.seedNames),
});

const liveRequestBody = (request: EdhrecRecommendationRequest) => {
  const commanders = displayUniqueNames([request.commanderName, request.partnerName]);
  return {
    cards: displayUniqueNames(request.seedNames),
    commanders,
    name: commanders[0] ?? request.commanderName.trim(),
  };
};

const liveCardName = (entry: LiveEdhrecCard): string | null => {
  if (typeof entry.name === "string") return entry.name;
  if (typeof entry.card === "string") return entry.card;
  if (entry.card && typeof entry.card.name === "string") return entry.card.name;
  return null;
};

async function recommendationForName(catalog: CardCatalog, name: string, index: number, reason: string): Promise<EdhrecRecommendedCard | null> {
  const card = await catalog.findByName(name);
  if (!card) return null;
  return {
    card,
    name: card.name,
    synergyScore: Math.max(0, 100 - index * 3),
    inclusionRate: null,
    sourceReason: reason,
  };
}

async function rehydrateCachedResponse(catalog: CardCatalog, cached: EdhrecRecommendationResponse): Promise<EdhrecRecommendationResponse> {
  const cards: EdhrecRecommendedCard[] = [];

  for (const recommendation of cached.cards) {
    const card = await catalog.findByName(recommendation.name) ?? recommendation.card;
    cards.push({
      ...recommendation,
      card,
      name: card.name,
    });
  }

  return {
    ...cached,
    source: "cache",
    cards,
  };
}

export function createFixtureEdhrecProvider(catalog: CardCatalog): EdhrecProvider {
  return {
    async getCommanderRecommendations(request) {
      const cards = await Promise.all(fixtureRecommendationNames.map((name, index) =>
        recommendationForName(catalog, name, index, `${name} is a deterministic fixture recommendation for ${request.commanderName}.`)
      ));

      return {
        source: "fixture",
        commanderName: request.commanderName,
        cards: cards.filter((card): card is EdhrecRecommendedCard => card !== null),
        attributionUrl: attributionUrl(request.commanderName),
      };
    },
  };
}

export function createLiveEdhrecProvider(options: LiveEdhrecOptions): EdhrecProvider {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async getCommanderRecommendations(request) {
      const cacheKey = cacheKeyFor(request);
      const cached = await options.cache.get<EdhrecRecommendationResponse>("edhrec", cacheKey);
      if (cached) return rehydrateCachedResponse(options.catalog, cached);

      const response = await options.limiter.schedule(() => fetchImpl("https://edhrec.com/api/recs", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": options.userAgent,
        },
        body: JSON.stringify(liveRequestBody(request)),
      }));
      if (!response.ok) throw new Error(`EDHREC request failed with ${response.status}`);

      const payload = await response.json() as LiveEdhrecPayload;
      const liveCards = payload.inRecs ?? payload.cards ?? [];
      const cards: EdhrecRecommendedCard[] = [];

      for (const [index, entry] of liveCards.entries()) {
        const name = liveCardName(entry);
        if (!name) continue;
        const card = await options.catalog.findByName(name);
        if (!card) continue;
        cards.push({
          card,
          name: card.name,
          synergyScore: entry.score ?? entry.synergyScore ?? entry.synergy ?? Math.max(0, 100 - index * 3),
          inclusionRate: entry.inclusionRate ?? entry.inclusion ?? null,
          sourceReason: entry.reason ?? `${card.name} was recommended by EDHREC for ${request.commanderName}.`,
        });
      }

      const result: EdhrecRecommendationResponse = {
        source: "live",
        commanderName: request.commanderName.trim(),
        cards,
        attributionUrl: attributionUrl(request.commanderName),
      };
      await options.cache.set("edhrec", cacheKey, result, SEVEN_DAYS_MS);
      return result;
    },
  };
}
