import type { Card, CardPrice, Color, ManaSymbol } from "@/domain/cards/types";
import { normalize } from "@/domain/cards/card-catalog";
import { scryfallCardSchema, scryfallSearchResponseSchema, type ScryfallCard } from "@/domain/cards/scryfall-schema";
import type { ProviderCache } from "@/domain/shared/cache";
import type { RateLimiter } from "@/domain/shared/rate-limit";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

type FetchImpl = typeof fetch;

export type ScryfallClient = {
  search(query: string): Promise<Card[]>;
  named(name: string): Promise<Card | null>;
};

export type ScryfallClientOptions = {
  cache: ProviderCache;
  limiter: RateLimiter;
  userAgent: string;
  fetchImpl?: FetchImpl;
  baseUrl?: string;
};

const parsePrice = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapPrices = (prices: ScryfallCard["prices"]): CardPrice => ({
  usd: parsePrice(prices.usd),
  eur: parsePrice(prices.eur),
  tix: parsePrice(prices.tix),
});

const cacheKeyInput = (value: string) => value.trim().toLowerCase();
const NOT_FOUND_STATUSES = new Set([400, 404]);

const isCommanderShaped = (card: Card) => {
  const typeLine = card.typeLine.toLowerCase();
  return typeLine.includes("legendary") && typeLine.includes("creature");
};

const searchMatchScore = (query: string, card: Card) => {
  const needle = normalize(query);
  const name = normalize(card.name);
  if (!needle || !name) return 0;
  if (name === needle) return 100;
  if (name.startsWith(`${needle} `)) return 90;
  if (name.split(" ").includes(needle)) return 80;
  if (name.includes(needle)) return 40;
  return 0;
};

const bestSearchMatch = (query: string, cards: Card[]) => {
  const ranked = cards
    .map((card) => ({ card, score: searchMatchScore(query, card) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference !== 0) return scoreDifference;

      const commanderDifference = Number(isCommanderShaped(right.card)) - Number(isCommanderShaped(left.card));
      if (commanderDifference !== 0) return commanderDifference;

      const leftRank = left.card.edhrecRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.card.edhrecRank ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) return leftRank - rightRank;

      return left.card.name.length - right.card.name.length;
    });

  return ranked[0]?.card ?? null;
};

export function normalizeScryfallCard(raw: unknown): Card {
  const card = scryfallCardSchema.parse(raw);
  const firstFace = card.card_faces?.[0];
  const imageUrl = card.image_uris?.normal ?? firstFace?.image_uris?.normal ?? null;
  const oracleText = card.oracle_text || card.card_faces?.map((face) => face.oracle_text).filter(Boolean).join("\n") || "";

  return {
    id: card.id,
    oracleId: card.oracle_id,
    name: card.name,
    normalizedName: normalize(card.name),
    manaCost: card.mana_cost,
    manaValue: card.cmc,
    colorIdentity: card.color_identity as Color[],
    typeLine: card.type_line || firstFace?.type_line || "",
    oracleText,
    legalities: card.legalities,
    edhrecRank: card.edhrec_rank,
    gameChanger: card.game_changer,
    prices: mapPrices(card.prices),
    purchaseUris: card.purchase_uris,
    imageUrl,
    ...(card.produced_mana ? { producedMana: card.produced_mana as ManaSymbol[] } : {}),
  };
}

export function createScryfallClient(options: ScryfallClientOptions): ScryfallClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? "https://api.scryfall.com";
  const headers = {
    Accept: "application/json",
    "User-Agent": options.userAgent,
  };

  const searchCards = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const normalizedQuery = cacheKeyInput(trimmedQuery);
    const cacheKey = `search:${normalizedQuery}`;
    const cached = await options.cache.get<Card[]>("scryfall", cacheKey);
    if (cached) return cached;

    const url = `${baseUrl}/cards/search?q=${encodeURIComponent(trimmedQuery)}`;
    const response = await options.limiter.schedule(() => fetchImpl(url, {
      headers,
    }));
    if (response.status === 404) {
      await options.cache.set("scryfall", cacheKey, [], ONE_HOUR_MS);
      return [];
    }
    if (!response.ok) throw new Error(`Scryfall request failed with ${response.status}`);
    const raw = scryfallSearchResponseSchema.parse(await response.json());
    const cards = raw.data.map(normalizeScryfallCard);
    await options.cache.set("scryfall", cacheKey, cards, ONE_HOUR_MS);
    return cards;
  };

  const fetchNamedCard = async (matchMode: "exact" | "fuzzy", name: string): Promise<Card | null> => {
    const url = `${baseUrl}/cards/named?${matchMode}=${encodeURIComponent(name)}`;
    const response = await options.limiter.schedule(() => fetchImpl(url, {
      headers,
    }));
    if (NOT_FOUND_STATUSES.has(response.status)) return null;
    if (!response.ok) throw new Error(`Scryfall request failed with ${response.status}`);
    return normalizeScryfallCard(await response.json());
  };

  return {
    async search(query) {
      return searchCards(query);
    },

    async named(name) {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      const normalizedName = cacheKeyInput(trimmedName);
      const cacheKey = `named:${normalizedName}`;
      const cached = await options.cache.get<Card>("scryfall", cacheKey);
      if (cached) return cached;

      const exactCard = await fetchNamedCard("exact", trimmedName);
      const fuzzyCard = exactCard ?? await fetchNamedCard("fuzzy", trimmedName);
      const card = fuzzyCard ?? bestSearchMatch(trimmedName, await searchCards(trimmedName));
      if (!card) return null;
      await options.cache.set("scryfall", cacheKey, card, ONE_DAY_MS);
      return card;
    },
  };
}
