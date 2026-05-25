import { normalize, type CardCatalog, type CardSearchResult } from "@/domain/cards/card-catalog";
import type { Card } from "@/domain/cards/types";
import type { ScryfallClient } from "@/domain/cards/scryfall-client";

type ScryfallCatalogOptions = {
  client: Pick<ScryfallClient, "named" | "search">;
  fallbackCards?: Card[];
  extraCards?: Card[];
};

type HybridCatalogOptions = {
  primary: CardCatalog;
  fallbackCards?: Card[];
  extraCards?: Card[];
};

const toSearchResult = ({ id, name, manaCost, typeLine, colorIdentity, imageUrl }: Card): CardSearchResult => ({
  id,
  name,
  manaCost,
  typeLine,
  colorIdentity,
  imageUrl,
});

function mergeCards(...groups: Card[][]): Card[] {
  const oracleIds = new Set<string>();
  const names = new Set<string>();
  const cards: Card[] = [];

  for (const group of groups) {
    for (const card of group) {
      const oracleKey = card.oracleId.trim();
      const nameKey = normalize(card.name);
      if (oracleKey && oracleIds.has(oracleKey)) continue;
      if (names.has(nameKey)) continue;
      if (oracleKey) oracleIds.add(oracleKey);
      names.add(nameKey);
      cards.push(card);
    }
  }

  return cards;
}

function mergeSearchResults(...groups: CardSearchResult[][]): CardSearchResult[] {
  const ids = new Set<string>();
  const names = new Set<string>();
  const results: CardSearchResult[] = [];

  for (const group of groups) {
    for (const card of group) {
      const nameKey = normalize(card.name);
      if (ids.has(card.id) || names.has(nameKey)) continue;
      ids.add(card.id);
      names.add(nameKey);
      results.push(card);
    }
  }

  return results;
}

const findLocalCard = (cards: Card[], name: string) => {
  const key = normalize(name);
  return cards.find((card) => normalize(card.name) === key) ?? null;
};

const searchLocalCards = (cards: Card[], query: string) => {
  const needle = normalize(query);
  if (!needle) return [];
  return cards.filter((card) => normalize(card.name).includes(needle)).map(toSearchResult);
};

export function createScryfallCardCatalog(options: ScryfallCatalogOptions): CardCatalog {
  const localCards = () => mergeCards(options.extraCards ?? [], options.fallbackCards ?? []);

  return {
    async findByName(name) {
      return findLocalCard(localCards(), name) ?? await options.client.named(name);
    },
    async search(query) {
      const liveResults = (await options.client.search(query)).map(toSearchResult);
      return mergeSearchResults(liveResults, searchLocalCards(localCards(), query)).slice(0, 20);
    },
    async allCards() {
      return localCards();
    },
  };
}

export function createHybridCardCatalog(options: HybridCatalogOptions): CardCatalog {
  const localCards = () => mergeCards(options.extraCards ?? [], options.fallbackCards ?? []);

  return {
    async findByName(name) {
      return findLocalCard(localCards(), name) ?? await options.primary.findByName(name);
    },
    async search(query) {
      return mergeSearchResults(await options.primary.search(query), searchLocalCards(localCards(), query)).slice(0, 20);
    },
    async allCards() {
      return mergeCards(options.extraCards ?? [], await options.primary.allCards(), options.fallbackCards ?? []);
    },
  };
}
