import { describe, expect, it } from "vitest";
import { buildBuyList } from "@/domain/decks/buy-list";
import { fixtureCard, fixtureDeck } from "@/domain/decks/demo-fixtures";

describe("buildBuyList", () => {
  it("prioritizes missing functional cards within budget", () => {
    const owned = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard);
    const buyList = buildBuyList({ deck: fixtureDeck(), ownedCards: owned, budgetUsd: 40 });
    expect(buyList.items[0].priority).toMatch(/Required|High-impact/);
    expect(buyList.totalSelectedUsd).toBeLessThanOrEqual(40);
  });
});
