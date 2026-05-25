import { describe, expect, it } from "vitest";
import { buildBuyList } from "@/domain/decks/buy-list";
import type { AssembledDeck, DeckCardEntry } from "@/domain/decks/deck-assembler";
import { fixtureCard, fixtureDeck } from "@/domain/decks/demo-fixtures";

const deckEntry = (name: string, role: DeckCardEntry["role"], ownedQuantity = 0): DeckCardEntry => {
  const card = fixtureCard(name);
  return {
    card,
    quantity: 1,
    ownedQuantity,
    role,
    sourceReason: `${card.name} is included in a buy-list test deck.`,
  };
};

describe("buildBuyList", () => {
  it("prioritizes missing functional cards within budget", () => {
    const owned = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard);
    const buyList = buildBuyList({ deck: fixtureDeck(), ownedCards: owned, budgetUsd: 40 });
    expect(buyList.items[0].priority).toMatch(/Required|High-impact/);
    expect(buyList.totalSelectedUsd).toBeLessThanOrEqual(40);
  });

  it("stops selecting once the next sorted item would exceed budget", () => {
    const commander = fixtureCard("Alela, Artful Provocateur");
    const deck: AssembledDeck = {
      commander,
      cards: [deckEntry(commander.name, ["payoff"], 1), deckEntry("Watery Grave", ["land"]), deckEntry("Swords to Plowshares", ["removal"])],
      validation: { ok: true, value: true },
    };

    const buyList = buildBuyList({ deck, ownedCards: [commander], budgetUsd: 5 });

    expect(buyList.items.map((item) => item.card.name)).toEqual(["Watery Grave", "Swords to Plowshares"]);
    expect(buyList.items.map((item) => item.selectedWithinBudget)).toEqual([false, false]);
    expect(buyList.totalSelectedUsd).toBe(0);
  });
});
