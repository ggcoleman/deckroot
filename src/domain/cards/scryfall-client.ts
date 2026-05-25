import type { Card, CardPrice, Color } from "@/domain/cards/types";
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
    ...(card.produced_mana ? { producedMana: card.produced_mana as Color[] } : {}),
  };
}

export function createScryfallClient(options: ScryfallClientOptions): ScryfallClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? "https://api.scryfall.com";

  const getJson = async (url: string) => {
    const response = await options.limiter.schedule(() => fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": options.userAgent,
      },
    }));
    if (!response.ok) throw new Error(`Scryfall request failed with ${response.status}`);
    return response.json() as Promise<unknown>;
  };

  return {
    async search(query) {
      const cacheKey = `search:${query}`;
      const cached = await options.cache.get<Card[]>("scryfall", cacheKey);
      if (cached) return cached;

      const url = `${baseUrl}/cards/search?q=${encodeURIComponent(query)}`;
      const raw = scryfallSearchResponseSchema.parse(await getJson(url));
      const cards = raw.data.map(normalizeScryfallCard);
      await options.cache.set("scryfall", cacheKey, cards, ONE_HOUR_MS);
      return cards;
    },

    async named(name) {
      const cacheKey = `named:${name}`;
      const cached = await options.cache.get<Card>("scryfall", cacheKey);
      if (cached) return cached;

      const url = `${baseUrl}/cards/named?exact=${encodeURIComponent(name)}`;
      const response = await options.limiter.schedule(() => fetchImpl(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": options.userAgent,
        },
      }));
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Scryfall request failed with ${response.status}`);

      const card = normalizeScryfallCard(await response.json());
      await options.cache.set("scryfall", cacheKey, card, ONE_DAY_MS);
      return card;
    },
  };
}
