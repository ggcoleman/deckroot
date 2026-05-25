import { describe, expect, it } from "vitest";
import { analyzeDeck } from "@/domain/decks/deck-analysis";
import { fixtureDeck } from "@/domain/decks/demo-fixtures";

describe("analyzeDeck", () => {
  it("summarizes curve, roles, price, and bracket reasons", () => {
    const deck = fixtureDeck();
    expect(deck.cards).toHaveLength(100);
    const actualLandCount = deck.cards.filter((entry) => entry.role.includes("land")).length;
    expect(actualLandCount).toBeGreaterThanOrEqual(34);
    expect(actualLandCount).toBeLessThanOrEqual(40);
    const analysis = analyzeDeck(deck);
    expect(analysis.roles.land).toBe(actualLandCount);
    expect(analysis.estimatedPriceUsd).toBeGreaterThan(0);
    expect(analysis.bracket.recommended).toBeGreaterThanOrEqual(1);
    expect(analysis.bracket.reasons.join(" ")).toContain("Rule Zero");
  });
});
