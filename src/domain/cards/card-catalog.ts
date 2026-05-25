import type { Card } from "@/domain/cards/types";
import { fixtureCards } from "@/domain/decks/demo-fixtures";

export type CardSearchResult = Pick<Card, "id" | "name" | "manaCost" | "typeLine" | "colorIdentity" | "imageUrl">;

export type CardCatalog = {
  findByName(name: string): Promise<Card | null>;
  search(query: string): Promise<CardSearchResult[]>;
  allCards(): Promise<Card[]>;
};

export function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function createFixtureCardCatalog(cards: Card[] = fixtureCards): CardCatalog {
  const byName = new Map(cards.map((card) => [normalize(card.name), card]));
  return {
    async findByName(name) {
      return byName.get(normalize(name)) ?? null;
    },
    async search(query) {
      const needle = normalize(query);
      return cards
        .filter((card) => normalize(card.name).includes(needle))
        .slice(0, 20)
        .map(({ id, name, manaCost, typeLine, colorIdentity, imageUrl }) => ({ id, name, manaCost, typeLine, colorIdentity, imageUrl }));
    },
    async allCards() {
      return cards;
    }
  };
}
